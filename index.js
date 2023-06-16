const express = require('express');
const bodyParser = require('body-parser');
const generateImage = require('./generateImage');
const formatData = require('./formatData');
const utils = require('./utils');

const port = 3000;
const app = express();
app.set('timeout', 30000);
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});
app.use(express.static('public'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.get('/ping', async (req, res) => {
  res.json("pong")
})
app.post('/generate', async (req, res) => {
  try {
    const data = formatData(req.body);
    const coords = req.body.map(x => [x.lon ?? x.Lon, x.lat ?? x.Lat]);
    const { minMax, center } = utils.calcCenterAndZoom(coords);
    await generateImage({ data, res, minMax, center });
  }
  catch (e) {
    console.log(e);
    res.status(500).send(e.message);
  }

});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});