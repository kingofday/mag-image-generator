const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const puppeteer = require('puppeteer');
let svgString;
let map;
let browser;
let html;
let ts;
const generateImage = async ({
    data,
    res,
    minMax,
    center }) => {
    if (ts)
        clearTimeout(ts);
    if (!browser) {
        browser = await puppeteer.launch({ headless: 'new', protocolTimeout: config.timout });
    }
    // Launch headless browser
    //await page.goto(`file://${__dirname}/template/map.html`);
    if (!html)
        html = fs.readFileSync(`${__dirname}/template/map.html`, 'utf8');
    const page = await browser.newPage();
    await page.setContent(html);
    if (!svgString)
        svgString = fs.readFileSync(__dirname + "/public/assets/antenna.svg", "utf8");
    page.on('console', message => {
        console.log(`${message.text()}`);
    });
    const series = Object.values(data);
    const numberOfLegendRows = series.reduce((acc, x) => {
        let rows = Math.ceil(x.label.length / config.maxLegendCharLengthInARow);
        return acc + rows;
    }, 0)
    const legendsBoxCount = Math.ceil(numberOfLegendRows / config.maxNumberOfLegendInColumn);
    await page.setViewport({
        width: 800 + (legendsBoxCount * 120),
        height: 605,
        deviceScaleFactor: 4
    });
    await page.waitForSelector('#wrapper');
    //=== adding legends
    await page.evaluate((series, maxNumberOfLegendInColumn, maxLegendCharLengthInARow) => {
        const $wrapper = document.querySelector('#legends-wrapper');
        let sum = 0;
        let legends = '';
        let col = 1;
        for (let i = 0; i < series.length; i++) {
            const sery = series[i];
            let rows = Math.ceil(sery.label.length / maxLegendCharLengthInARow);
            legends += `<span class="legend"><span class="legend-symbol ${sery.cband ? "circle" : ""}" style="${sery.cband ? `border-color:${sery.color}` : `background-color:${sery.color};`}"></span>${sery.label}</span>`;
            if ((sum + rows) > maxNumberOfLegendInColumn || i === series.length - 1) {
                $wrapper.innerHTML += `<div class="legends">${legends}</div>`;
                legends = '';
                col++;
                sum = 0
            }
            sum += rows;
        }
    }, series, config.maxNumberOfLegendInColumn, config.maxLegendCharLengthInARow);
    //=== adding map

    await page.evaluate((map, series, minMax, center, token, svgString, equalRadius, clusteringThreashold) => {
        return new Promise(async (resolve, reject) => {
            mapboxgl.accessToken = token;
            map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v11',
                center: center,
                zoom: 8.5
            });
            map.on('load', async () => {
                try {
                    let idx = 0;
                    let coloredSeriesCount = 0;
                    let allColoredSeriesCount = series.filter(x => !x.icon).length;
                    console.log("===> start processing")
                    for (let sery of series) {
                        const clusteringEnabled = sery.points.length > clusteringThreashold;
                        const geoJson = {
                            type: 'geojson',
                            cluster: clusteringEnabled,
                            clusterMaxZoom: 10,
                            clusterRadius: 5,
                            data: {
                                "type": "FeatureCollection",
                                "features": []
                            }
                        };
                        for (let point of sery.points) {
                            geoJson.data.features.push({
                                "type": "Feature",
                                "properties": {
                                    label: sery.label,
                                    icon: sery.icon,
                                    color: sery.color,
                                    angle: point.angle
                                },
                                "geometry": {
                                    "type": "Point",
                                    "coordinates": point.coord
                                }
                            })
                        }
                        map.addSource(`source-${idx}`, geoJson);
                         if (sery.icon) {
                            await new Promise((imgRes) => {
                                let img = new Image(8, 8);
                                img.onload = () => {
                                    map.addImage(`antenna-${idx}`, img);
                                    imgRes();
                                }
                                img.onerror = err => console.log("load antenna " + JSON.stringify(err));
                                img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString.replace("red", sery.color))}`;
                            }, reason => {
                                console.log(JSON.stringify(reason))
                            });
                            map.addLayer({
                                id: `icon-layer-${idx}`,
                                type: 'symbol',
                                source: `source-${idx}`,
                                layout: {
                                    'icon-image': `antenna-${idx}`,
                                    'icon-size': 1,
                                    'icon-anchor': 'bottom',
                                    'icon-allow-overlap': true,
                                    "icon-rotate": ["get", "angle"]
                                }
                            });
                        }
                        else {
                            map.addLayer({
                                id: `dot-layer-${idx}`,
                                type: 'circle',
                                source: `source-${idx}`,
                                filter: clusteringEnabled ? ["has", "point_count"] : [],
                                paint: {
                                    'circle-color': sery.color,
                                    'circle-radius': equalRadius ? 2 : (clusteringEnabled?3:1) + (allColoredSeriesCount - coloredSeriesCount - 1) * 1.5
                                }
                            });
                            if (clusteringEnabled)
                                map.addLayer({
                                    id: `dot-layer-${idx}`,
                                    type: 'circle',
                                    source: `source-${idx}`,
                                    filter: ["!", ["has", "point_count"]],
                                    paint: {
                                        'circle-color': sery.color,
                                        'circle-radius': equalRadius ? 2 : 1 + (allColoredSeriesCount - coloredSeriesCount - 1) * 1.5
                                    }
                                });
                            coloredSeriesCount++;
                        }
                        idx++;
                        console.log(`[sery: ${sery.label}, points: ${sery.points.length}, color:${sery.color}]`)
                    }
                    console.log("===> end of processing")
                    map.fitBounds(minMax, {
                        padding: 50,
                        duration: 0
                    })
                    map.once('idle', () => {
                        console.log("===> map loaded")
                        resolve();
                    });
                }
                catch (e) {
                    console.log("error is: ",JSON.stringify(e))
                    resolve();
                }
                // map.on('render', function() {

                //     if (!map.loaded()) {
                //       setTimeout(()=>resolve(),4000)
                //     } else {
                //         console.log("the end")
                //         resolve();
                //     }
                //   });
            });
        });
    }, map,
        series,
        minMax,
        center,
        config.mapBoxToken,
        svgString,
        series.length >= config.normalRadiusSeriseLimit,
        config.clusteringThreashold);
    // Take screenshot of map
    const screenshot = await page.screenshot({ type: 'png' });
    page.close();
    // Save image to file
    const filename = `${uuidv4().replace("-", "_")}.png`;
    fs.writeFileSync(`./public/exports/${filename}`, screenshot);

    const imageUrl = `${config.baseUrl}:${config.port}/exports/${filename}`;
    res.json(imageUrl);
    ts = setTimeout(async () => {
        await browser.close();
        browser = null;
    }, config.waitingTime);

}
module.exports = generateImage;