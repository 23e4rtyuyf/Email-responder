require('dotenv').config();
const { createApp } = require('./app');
const { assertJwtSecretIsConfigured } = require('./auth');

const port = process.env.PORT || 4000;

assertJwtSecretIsConfigured();

createApp()
  .then((app) => {
    app.listen(port, () => {
      console.log(`Backend API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
