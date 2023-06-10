module.exports = (data) => {
    let series = {};
    for (let d of data) {
        let sery = series[d.label]
        if (sery)
            sery.points.push({ angle: d.angle, coord: [Number(d.lon ?? d.Lon), Number(d.lat ?? d.Lat)] })
        else series[d.label] = {
            label: d.label,
            color: d.color,
            icon: d.icon,
            points: [{ angle: d.angle, coord: [Number(d.lon ?? d.Lon), Number(d.lat ?? d.Lat)] }]
        };
    }
    return series;
}