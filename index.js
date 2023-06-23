const express = require('express');
const bodyParser = require('body-parser');
const generateImage = require('./generateImage');
const formatData = require('./formatData');
const utils = require('./utils');
const config = require('./config');
const app = express();
app.set('timeout', config.timout);
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});
app.use(express.static('public'));
app.use(express.json({ limit: config.requstLimit }));
app.use(express.urlencoded({ limit: config.requstLimit, extended: true }));

app.get('/ping', async (req, res) => {
  res.json("pong")
})
app.post('/generate', async (req, res) => {
  try {
    const {series,center,minMax} = formatData(req.body);

    // const { minMax, center } = utils.calcCenterAndZoom({
    //   data: data.data,
    //   latIdx,
    //   lonIdx
    // });
    await generateImage({
      data: series,
      res,
      minMax,
      center
    });
  }
  catch (e) {
    console.log(e);
    res.status(500).send(e.message);
  }

});
app.listen(config.port, () => {
  console.log(`Server started on port ${config.port}`);
});