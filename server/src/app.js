const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const announcementRoutes = require('./routes/announcements');
const eventRoutes = require('./routes/events');
const settingsRoutes = require('./routes/settings');
const contentRoutes = require('./routes/content');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/content', contentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;
