const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const announcementRoutes = require('./routes/announcements');
const eventRoutes = require('./routes/events');
const settingsRoutes = require('./routes/settings');
const contentRoutes = require('./routes/content');
const uploadRoutes = require('./routes/uploads');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/content', contentRoutes);
// Under /api, and deliberately not under /uploads: Vite's dev proxy forwards only /api,
// and the SPA fallback below answers every non-/api GET with index.html — so at /uploads
// the TV would get HTML where it expected a JPEG. Not under /api/content/uploads either,
// where router.post('/:panel') already lives and correctness would depend on declaration
// order, the trap the /settings comment in routes/content.js warns about.
app.use('/api/uploads', uploadRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// In production this process serves the built client as well as the API, so the TV, the
// congregation's phones and the admin all sit behind ONE origin and one certificate. That
// is also what lets the client ask for a relative '/api' (see client/src/services/api.js)
// instead of a hardcoded port, which HTTPS would both break and block as mixed content.
//
// Guarded on the build actually existing: in development it is Vite that serves the
// client, client/dist is often absent, and a stale one must never be served in its place.
const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  app.use(express.static(CLIENT_DIST));

  // Single-page-app fallback. '/adminGabbai' and '/zmanim' are React Router paths with no
  // file behind them, so a refresh or a pasted link has to be answered with index.html.
  //
  // Deliberately a bare middleware rather than app.get('*'): Express 5 parses route
  // strings with path-to-regexp v8, which rejects a lone '*' and throws at startup.
  //
  // It also has to skip '/api', or an unknown API path would answer 200 with HTML and the
  // caller would report a JSON parse failure instead of the 404 that actually happened.
  app.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: 'Something went wrong!' });
});

module.exports = app;
