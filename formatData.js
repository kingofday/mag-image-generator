const config = require("./config");
const utils = require("./utils");
//lat:0, lon:1, label:2, color:3, icon:4, degree:5

module.exports = (data) => {
    let series = {};
    const colors = [`hsla(0, 0%, 100%, ${config.iconOpacity})`];
    let latIdx = data.columns.indexOf("lat");
    let lonIdx = data.columns.indexOf("lon");
    let lblIdx = data.columns.indexOf("label");
    let colorIdx = data.columns.indexOf("color");
    let iconIdx = data.columns.indexOf("icon");
    let degreeIdx = data.columns.indexOf("degree");
    const cleanedData = data.data.filter(x => !!x[lblIdx]);
    let minLon = cleanedData[0][lonIdx];
    let maxLon = cleanedData[0][lonIdx];
    let minLat = cleanedData[0][latIdx];
    let maxLat = cleanedData[0][latIdx];
    for (let i = 0; i < cleanedData.length; i++) {
        let d = cleanedData[i];
        minLon = Math.min(minLon, d[lonIdx]);
        maxLon = Math.max(maxLon, d[lonIdx]);
        minLat = Math.min(minLat, d[latIdx]);
        maxLat = Math.max(maxLat, d[latIdx]);
        let sery = series[d[lblIdx]];
        if (sery)
            sery.points.push({
                angle: Math.round(d[degreeIdx]),
                coord: [Number(d[lonIdx]), Number(d[latIdx])]
            })
        else {
            let color = d[colorIdx];
            if (!color) {
                color = utils.generateColor(colors);
                colors.push(color);
            }
            series[d[lblIdx]] = {
                label: d[lblIdx],
                color: color,
                icon: d[iconIdx],
                cband: "",
                points: [{ angle: Math.round(d[degreeIdx]), coord: [Number(d[lonIdx]), Number(d[latIdx])] }]
            };
        }
    }
    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;

    const center = [centerLon, centerLat];
    return {
        series,
        center,
        minMax: [
            [minLon, minLat],
            [maxLon, maxLat]
        ]
    };
}