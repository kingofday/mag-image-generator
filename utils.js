const config = require("./config");

const utils = {
    calcCenterAndZoom: function (coordinates) {
        let minLon = coordinates[0][0];
        let maxLon = coordinates[0][0];
        let minLat = coordinates[0][1];
        let maxLat = coordinates[0][1];

        for (let i = 1; i < coordinates.length; i++) {
            const [lon, lat] = coordinates[i];

            minLon = Math.min(minLon, lon);
            maxLon = Math.max(maxLon, lon);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
        }

        const centerLon = (minLon + maxLon) / 2;
        const centerLat = (minLat + maxLat) / 2;

        const center = [centerLon, centerLat];

        return {
            center,
            minMax: [
                [minLon, minLat],
                [maxLon, maxLat]
            ],
        };
    },
    generateColor: function (previousColors) {
        let color;
        do {
            const hue = Math.floor(Math.random() * 360);
            const saturation = Math.floor(Math.random() * 80) + 20;
            const luminance = Math.floor(Math.random() * 80) + 20;
            color = `hsl(${hue}, ${saturation}%, ${luminance}%,${config.antennaOpacity})`;
        } while (this.isColorSimilar(color, previousColors))
        return color;
    },
    isColorSimilar: function (color, previousColors) {
        const { r, g, b, a } = this.hslToRgba(color);

        return previousColors.some(c => {
            const { r: pr, g: pg, b: pb, a: pa } = this.hslToRgba(c);

            const diff =
                Math.abs(r - pr) * a +
                Math.abs(g - pg) * a +
                Math.abs(b - pb) * a;

            return diff > 255 * 0.15;
        });
    },
    hslToRgba: function (hsl) {
        // Expects hsl in 'hsl(120, 50%, 70%)' format
        let h = hsl.slice(hsl.indexOf('hsl(') + 4).split(',')[0] / 360;
        let s = hsl.slice(hsl.indexOf('hsl(') + 4).split(',')[1].slice(0, -1) / 100;
        let l = hsl.slice(hsl.indexOf('hsl(') + 4).split(',')[2].slice(0, -1) / 100;

        let c = (1 - Math.abs(2 * l - 1)) * s,
            x = c * (1 - Math.abs(h % 2 - 1)),
            m = l - c / 2,
            r = 0,
            g = 0,
            b = 0;

        if (h < 1) {
            r = c;
            g = x;
        } else if (h < 2) {
            r = x;
            g = c;
        } else if (h < 3) {
            g = c;
            b = x;
        } else if (h < 4) {
            g = x;
            b = c;
        } else if (h <= 5) {
            r = x;
            b = c;
        } else {
            r = c;
            b = x;
        }

        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);

        return { r, g, b, a: config.antennaOpacity };
    }
}
module.exports = utils;