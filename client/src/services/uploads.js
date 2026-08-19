import api from './api';

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image decode failed'));
    };
    image.src = url;
  });

// Draws the file to a canvas at most MAX_EDGE on its long edge and exports it again.
//
// Size is the obvious reason — a 5MB phone photo leaves as roughly 200KB, which matters
// on a Railway volume and on a TV that fetches it. But the re-encode also drops EXIF,
// including the location the phone stamped into a photo taken inside the shul, and any
// payload hidden in the original container: what gets uploaded is pixels this browser
// just drew.
//
// A PNG source stays PNG so transparency survives — a logo re-encoded to JPEG arrives
// with a white box around it.
async function shrink(file) {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, JPEG_QUALITY));
  if (!blob) throw new Error('image encode failed');
  return { blob, type };
}

// Resolves to the id the server assigned — the value that goes into the document as
// { type: 'img', id }. The path is never stored; the renderer builds it.
export async function uploadImage(file) {
  const { blob, type } = await shrink(file);
  // Raw bytes, overriding the instance's JSON content type. The server decides the real
  // format from the bytes anyway; this header only selects express.raw's parser.
  const res = await api.post('/uploads', blob, { headers: { 'Content-Type': type } });
  return res.data.id;
}
