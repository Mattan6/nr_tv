const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { CONTENT_DIR } = require('./contentStore');

// The only module that writes image files. They live beside content.json so one Railway
// volume holds all of the shul's content — see DEPLOY.md.
const UPLOAD_DIR = path.join(CONTENT_DIR, 'uploads');

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_FILES = 100;
const MAX_DIR_BYTES = 50 * 1024 * 1024;

class UploadError extends Error {}

// The type is decided by the bytes and never by the Content-Type header, which is written
// by whoever is calling — and this route, like the rest of the API, is unauthenticated.
// The extension that ends up on disk comes from here, which is what keeps a doc's image id
// inside the pattern store/richText.js enforces.
function detectType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
  return null;
}

// An absent directory is an empty one — the first upload creates it.
async function listFiles() {
  let names;
  try {
    names = await fs.readdir(UPLOAD_DIR);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }

  const files = [];
  for (const name of names) {
    try {
      const info = await fs.stat(path.join(UPLOAD_DIR, name));
      if (info.isFile()) files.push({ name, size: info.size, mtimeMs: info.mtimeMs });
    } catch (err) {
      // Vanished between readdir and stat — a concurrent sweep. Nothing to report.
      if (err.code !== 'ENOENT') throw err;
    }
  }
  return files;
}

async function saveImage(buffer) {
  const ext = detectType(buffer);
  if (!ext) throw new UploadError('הקובץ אינו תמונת JPEG או PNG');
  if (buffer.length > MAX_BYTES) throw new UploadError('התמונה גדולה מדי');

  // The caps are what stop an unauthenticated endpoint from filling the Railway volume.
  // They bound the damage; they do not prevent it. See the spec's restated auth section.
  const files = await listFiles();
  if (files.length >= MAX_FILES) {
    throw new UploadError(`אין מקום לתמונות נוספות — הגעת ל-${MAX_FILES} תמונות`);
  }
  const used = files.reduce((sum, file) => sum + file.size, 0);
  if (used + buffer.length > MAX_DIR_BYTES) throw new UploadError('אין מקום לתמונות נוספות');

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const id = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, id), buffer);
  return id;
}

module.exports = { UPLOAD_DIR, MAX_BYTES, MAX_FILES, MAX_DIR_BYTES, UploadError, detectType, listFiles, saveImage };
