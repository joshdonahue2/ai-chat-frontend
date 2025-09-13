const express = require('express');
const { router: imageGeneratorRouter } = require('./image-generator.router.js');

const app = express();

app.use('/api/image-generator', imageGeneratorRouter);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
