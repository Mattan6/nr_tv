// The rich document behind an announcement. Everything here exists to answer one
// question — is this legal — about a structure that arrived from the network rather
// than from our editor.
//
// The model is closed on purpose. No HTML is stored, so no surface renders with
// dangerouslySetInnerHTML and there is no sanitizer whose configuration has to stay
// correct forever; anything not named below is dropped or rejected here.

const MAX_TEXT = 600;
const MAX_BLOCKS = 40;
const MAX_IMAGES = 3;
const MAX_ALT = 100;

// A file this server wrote, and nothing else. The name is a UUID this process generated
// and an extension this process chose (see store/uploads.js), so an external host, a
// javascript: scheme, a traversal path and .svg — which browsers execute — are not
// filtered out, they are unrepresentable.
const IMAGE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$/;

// Fixed order, so two docs that mean the same thing serialize the same way.
const MARKS = ['b', 'i', 'u'];

// Thrown internally to abort with a specific Hebrew message; validateDoc converts it
// into the { error } half of the return value. The gabbai sees these strings.
class DocError extends Error {}

// Returns the normalised spans, dropping empty ones. Throws DocError on anything
// malformed — an unknown mark is a rejection, not something to quietly discard, because
// it means the sender is not the editor we shipped.
function spansOf(raw) {
  if (!Array.isArray(raw)) throw new DocError('תוכן ההודעה אינו תקין');
  const spans = [];

  for (const item of raw) {
    if (item === null || typeof item !== 'object') throw new DocError('תוכן ההודעה אינו תקין');
    if (typeof item.text !== 'string') throw new DocError('תוכן ההודעה אינו תקין');

    let marks = [];
    if (item.marks !== undefined) {
      if (!Array.isArray(item.marks)) throw new DocError('תוכן ההודעה אינו תקין');
      for (const mark of item.marks) {
        if (!MARKS.includes(mark)) throw new DocError('תוכן ההודעה אינו תקין');
      }
      marks = MARKS.filter((mark) => item.marks.includes(mark));
    }

    if (!item.text) continue;
    spans.push(marks.length ? { text: item.text, marks } : { text: item.text });
  }

  return spans;
}

// Returns the normalised block, or null for one that is well-formed but empty — an empty
// paragraph is dropped rather than rejected, because the editor produces them routinely
// and refusing to save over one would be maddening. Malformed blocks throw.
function blockOf(raw, counts) {
  if (raw === null || typeof raw !== 'object') throw new DocError('תוכן ההודעה אינו תקין');

  if (raw.type === 'p') {
    const spans = spansOf(raw.spans);
    return spans.length ? { type: 'p', spans } : null;
  }

  if (raw.type === 'ul' || raw.type === 'ol') {
    if (!Array.isArray(raw.items)) throw new DocError('תוכן ההודעה אינו תקין');
    const items = [];
    for (const entry of raw.items) {
      const spans = spansOf(entry);
      if (spans.length) items.push(spans);
    }
    return items.length ? { type: raw.type, items } : null;
  }

  if (raw.type === 'img') {
    if (typeof raw.id !== 'string' || !IMAGE_ID_RE.test(raw.id)) {
      throw new DocError('התמונה אינה מזוהה — נסה להעלות אותה שוב');
    }
    const alt = typeof raw.alt === 'string' ? raw.alt.trim() : '';
    if (alt.length > MAX_ALT) throw new DocError(`תיאור התמונה — עד ${MAX_ALT} תווים`);
    counts.images += 1;
    return { type: 'img', id: raw.id, alt };
  }

  throw new DocError('תוכן ההודעה אינו תקין');
}

const joinSpans = (spans) => spans.map((span) => span.text).join('');

// Blocks become lines and list items become lines; an image contributes nothing. This is
// what makes an image-only announcement's text an empty string — legal, and the reason
// required-ness is checked against the blocks rather than against this.
function plainText(blocks) {
  const lines = [];
  for (const block of blocks) {
    if (block.type === 'img') continue;
    if (block.type === 'p') lines.push(joinSpans(block.spans));
    else for (const item of block.items) lines.push(joinSpans(item));
  }
  return lines.join('\n');
}

function validateDoc(raw) {
  try {
    if (raw === null || typeof raw !== 'object' || !Array.isArray(raw.blocks)) {
      throw new DocError('תוכן ההודעה אינו תקין');
    }
    // Checked before the loop, so a hostile 100k-block body is refused rather than walked.
    if (raw.blocks.length > MAX_BLOCKS) throw new DocError(`עד ${MAX_BLOCKS} פסקאות בהודעה`);

    const counts = { images: 0 };
    const blocks = [];
    for (const entry of raw.blocks) {
      const block = blockOf(entry, counts);
      if (block) blocks.push(block);
    }

    if (counts.images > MAX_IMAGES) throw new DocError(`עד ${MAX_IMAGES} תמונות בהודעה`);
    if (!blocks.length) throw new DocError('שדה חובה');

    const text = plainText(blocks);
    if (text.length > MAX_TEXT) throw new DocError(`עד ${MAX_TEXT} תווים`);

    return { doc: { blocks }, text };
  } catch (err) {
    if (err instanceof DocError) return { error: err.message };
    throw err;
  }
}

module.exports = { validateDoc, IMAGE_ID_RE, MAX_TEXT, MAX_BLOCKS, MAX_IMAGES, MAX_ALT };
