const config = require("./config");
const utils = require("./utils");

module.exports = (data) => {
    let series = {};
    const colors = [`hsla(0, 0%, 100%, ${config.iconOpacity})`];
    const cleanedData = data.filter(x => !!x.label);
    for (let d of cleanedData) {
        let sery = series[d.label]
        if (sery)
            sery.points.push({
                angle: Math.round(d.degree),
                coord: [Number(d.lon ?? d.Lon), Number(d.lat ?? d.Lat)]
            })
        else {
            let color = d.color;
            if (!color) {
                color = utils.generateColor(colors);
                colors.push(color);
            }
            series[d.label] = {
                label: d.label,
                color: color,
                icon: d.icon,
                cband: d.cband,
                points: [{ angle: Math.round(d.degree), coord: [Number(d.lon ?? d.Lon), Number(d.lat ?? d.Lat)] }]
            };
        }
    }
    return series;
}