const puppeteer = require('puppeteer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const MAX_PAGES = 2;
let openPages = [];
const generateImage = async ({
    browser,
    data,
    res,
    minMax,
    center }) => {
    // Launch headless browser
    const page = await browser.newPage();
    openPages.push(page);
    console.log("=== pages:", openPages.length)
    if (openPages.length > MAX_PAGES) {
        openPages[0].close();
        openPages.shift();
      }
    //await page.goto(`file://${__dirname}/template/map.html`);
    const html = fs.readFileSync(`${__dirname}/template/map.html`, 'utf8');
    await page.setContent(html);
    const svgString = fs.readFileSync(__dirname + "/public/assets/antenna.svg", "utf8");
    page.on('console', message => {
        console.log(`${message.text()}`);
    });
    const series = Object.values(data);
    const numberOfLegendsInBox = 23;
    const legendsBoxCount = Math.ceil(series.length / numberOfLegendsInBox);
    await page.setViewport({
        width: 800 + (legendsBoxCount * 120),
        height: 605,
        deviceScaleFactor: 4
    });
    await page.waitForSelector('#wrapper');
    //=== adding legends
    await page.evaluate((series, legendsBoxCount, numberOfLegendsInBox) => {
        const $wrapper = document.querySelector('#legends-wrapper');
        for (let i = 0; i < legendsBoxCount; i++) {
            let legends = '';
            for (let j = i * numberOfLegendsInBox; j < ((i + 1) * numberOfLegendsInBox); j++) {
                if (j === series.length) break;
                const sery = series[j];
                legends += `<span class="legend"><span class="legend-symbol ${sery.cband ? "circle" : ""}" style="${sery.cband ? `border-color:${sery.color}` : `background-color:${sery.color};`}"></span>${sery.label}</span>`
            }
            $wrapper.innerHTML += `<div class="legends">${legends}</div>`;
        }
    }, series, legendsBoxCount, numberOfLegendsInBox);
    //=== adding map
    await page.evaluate((series, minMax, center, token, svgString) => {
        return new Promise((resolve, reject) => {
            mapboxgl.accessToken = token;
            const map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v11',
                center: center,
                zoom: 8.5
            });
            map.on('load', async () => {
                let idx = 0;
                let coloredSeriesCount = 0;
                let allColoredSeriesCount = series.filter(x => !x.icon).length;
                for (let sery of series) {
                    console.log(`[sery: ${sery.label}, points: ${sery.points.length}]`)
                    const geoJson = {
                        type: 'geojson',
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
                    if (sery.cband) {
                        map.addLayer({
                            id: `cband-layer-${idx}`,
                            type: 'circle',
                            source: `source-${idx}`,
                            paint: {
                                'circle-radius': 30,
                                'circle-color': 'transparent',
                                'circle-stroke-width': 3,
                                'circle-stroke-color': sery.color
                            }
                        });
                    }
                    else if (sery.icon) {
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
                            paint: {
                                'circle-color': sery.color,
                                'circle-radius': 1 + (allColoredSeriesCount - coloredSeriesCount - 1) * 1.5
                            }
                        });
                        coloredSeriesCount++;
                    }
                    idx++;
                }
                console.log("===> end of request")
                map.fitBounds(minMax, {
                    padding: 50,
                    duration: 0
                })
                map.once('idle', () => {
                    resolve();
                });

            });
        });
    }, series, minMax, center, config.mapBoxToken, svgString);
    //await new Promise(r => setTimeout(r, 3000));
    // Take screenshot of map
    const screenshot = await page.screenshot({ type: 'png' });
    // Save image to file
    const filename = `${uuidv4().replace("-", "_")}.png`;
    fs.writeFileSync(`./public/exports/${filename}`, screenshot);

    // Return URL to saved image
    const imageUrl = `${config.baseUrl}/exports/${filename}`;
    res.json(imageUrl);

    // Close headless browser

}
module.exports = generateImage;