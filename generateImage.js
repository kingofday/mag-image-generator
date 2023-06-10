const puppeteer = require('puppeteer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
//const antenna = require("./public/assets/antenna.svg")
const generateImage = async ({
    data,
    res,
    minMax,
    center }) => {
    // Launch headless browser
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage();

    // Load map in headless browser
    await page.goto(`file://${__dirname}/template/map.html`);
    const svgString = fs.readFileSync(__dirname + "/public/assets/antenna.svg", "utf8");
    page.on('console', message => {
        console.log(`${message.text()}`);
    });
    const series = Object.values(data);
    await page.setViewport({
        width: 950,
        height: 600
    });
    await page.waitForSelector('#wrapper');
    await page.waitForSelector('#legends');
    await page.evaluate((series, baseUrl, minMax, center, token, svgString) => {
        return new Promise((resolve, reject) => {
            //=== adding legends
            let legends = '';
            for (let sery of series) {
                legends += `<span class="legend"><span class="legend-symbol" style="background-color:${sery.color};"></span>${sery.label}</span>`
            }
            const legendsContainer = document.querySelector('#legends');
            legendsContainer.innerHTML = legends;
            mapboxgl.accessToken = token;
            const map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v11',
                center: center,
                zoom: 8.5
            });
            map.on('load', async () => {

                await new Promise((imgRes) => {
                    let img = new Image(20, 20)
                    img.onload = () => {
                        map.addImage("antenna", img);
                        imgRes();
                    }
                    img.onerror = err => console.log("load antenna " + JSON.stringify(err));
                    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
                    // map.loadImage(`${baseUrl}/assets/antenna.svg`, (error, image) => {
                    //     if (error) console.log(error);
                    //     map.addImage("antenna", image);
                    //     imgRes();
                    // });
                }, reason => {
                    console.log(reason)
                });

                console.log("=== loaded")
                let idx = 0;
                let coloredSeriesCount = 0;
                let allColoredSeriesCount = series.filter(x => !x.icon).length;
                for (let sery of series) {
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
                    if (sery.icon) {
                        // map.addLayer({
                        //     id: `dot-layer-${idx}`,
                        //     type: 'circle',
                        //     source: `source-${idx}`,
                        //     paint: {
                        //         'circle-color': sery.color,
                        //         'circle-radius': 3
                        //     }
                        // });
                        map.addLayer({
                            id: `icon-layer-${idx}`,
                            type: 'symbol',
                            source: `source-${idx}`,
                            layout: {
                                'icon-image': "antenna",
                                'icon-size': 1,
                                'icon-anchor': 'bottom',
                                'icon-allow-overlap': true,
                                "icon-rotate": ["get","angle"]
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
                                'circle-radius': 2 + (allColoredSeriesCount - coloredSeriesCount - 1) * 1.5,
                                'circle-stroke-width': 1,
                                'circle-stroke-color': '#ffffff'
                            }
                        });
                        coloredSeriesCount++;
                    }
                    idx++;
                }
                map.fitBounds(minMax, {
                    padding: 50,
                    duration: 0
                })
                map.once('idle', () => {
                    resolve();
                });

            });
        });
    }, series, config.baseUrl, minMax, center, config.mapBoxToken, svgString);
    //await new Promise(r => setTimeout(r, 3000));
    // Take screenshot of map
    const screenshot = await page.screenshot({ type: 'png' });
    console.log("=== is ok")
    // Save image to file
    const filename = `${uuidv4().replace("-", "_")}.png`;
    fs.writeFileSync(`./public/exports/${filename}`, screenshot);

    // Return URL to saved image
    const imageUrl = `${config.baseUrl}/exports/${filename}`;
    res.json({ imageUrl });

    // Close headless browser
    await browser.close();
}
module.exports = generateImage;