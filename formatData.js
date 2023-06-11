const utils = require("./utils");

module.exports = (data) => {
    let series = {};
    const colors = [];
    for (let d of data) {
        let sery = series[d.label]
        if (sery)
            sery.points.push({ angle: Math.round(d.degree), coord: [Number(d.lon ?? d.Lon), Number(d.lat ?? d.Lat)] })
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
                points: [{ angle: Math.round(d.degree), coord: [Number(d.lon ?? d.Lon), Number(d.lat ?? d.Lat)] }]
            };
        }
    }
    return series;
}