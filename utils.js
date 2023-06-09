module.exports = {
    calcCenterAndZoom: (coordinates) => {
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
            minMax:[
                [minLon, minLat],
                [maxLon, maxLat]
              ],
        };
    }
}