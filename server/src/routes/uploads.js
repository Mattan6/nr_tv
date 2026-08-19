const express = require('express');
const { UPLOAD_DIR, MAX_BYTES, UploadError, saveImage } = require('../store/uploads');

const router = express.Router();

// No auth, by the same decision as the rest of the API — but this is the first route that
// writes FILES, which the original decision was not made about. See the spec's
// "On the absence of auth — restated".

// Raw bytes rather than multipart or base64: multipart would mean adding multer, and
// base64 inflates by a third and would be refused by express.json()'s 100KB default
// anyway. A body past the limit is rejected by body-parser with a 413 before it reaches
// the handler.
router.post(
  '/',
  express.raw({ type: ['image/jpeg', 'image/png'], limit: MAX_BYTES }),
  async (req, res, next) => {
    // Not a Buffer when the Content-Type was something express.raw does not parse.
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      return res.status(400).json({ message: 'לא התקבלה תמונה' });
    }
    try {
      res.status(201).json({ id: await saveImage(req.body) });
    } catch (err) {
      if (err instanceof UploadError) return res.status(400).json({ message: err.message });
      next(err);
    }
  }
);

// Filenames are UUIDs and never change, so a TV left on for weeks may cache them forever;
// without this it re-downloads the image on every rotation. nosniff so a JPEG with HTML
// appended to it can never be sniffed into a document.
router.use(
  express.static(UPLOAD_DIR, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  })
);

module.exports = router;
