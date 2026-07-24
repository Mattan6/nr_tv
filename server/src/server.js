require('dotenv').config();
const connectDB = require('./config/database');

// dotenv must load before app.js: the content store reads CONTENT_DIR when it is
// first required, which happens down the app's require chain.
const app = require('./app');
const { contentStore } = require('./store/contentStore');
const { startJokeRefresh } = require('./jokes/refresh');

connectDB();

// Fills the בדיחות ליאור panel. Deliberately not awaited and scheduled well after boot:
// the wall must come up whether or not yo-yoo answers.
startJokeRefresh(contentStore);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
