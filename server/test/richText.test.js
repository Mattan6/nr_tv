const { test } = require('node:test');
const assert = require('node:assert');

const { validateDoc, MAX_TEXT, MAX_BLOCKS, MAX_IMAGES } = require('../src/store/richText');

const ID = '3f2b1a0c-4d5e-6f70-8192-a3b4c5d6e7f8.jpg';
const p = (text) => ({ type: 'p', spans: [{ text }] });

test('a well-formed doc round-trips and derives its text', () => {
  const { doc, text, error } = validateDoc({
    blocks: [
      { type: 'p', spans: [{ text: 'שיעור ' }, { text: 'הערב', marks: ['b'] }] },
      { type: 'ul', items: [[{ text: 'בית המדרש' }], [{ text: '20:00' }]] },
      { type: 'img', id: ID, alt: 'המודעה' },
    ],
  });

  assert.strictEqual(error, undefined);
  assert.strictEqual(text, 'שיעור הערב\nבית המדרש\n20:00');
  assert.strictEqual(doc.blocks.length, 3);
  assert.deepStrictEqual(doc.blocks[0].spans[1], { text: 'הערב', marks: ['b'] });
  assert.deepStrictEqual(doc.blocks[2], { type: 'img', id: ID, alt: 'המודעה' });
});

test('an image contributes no text, so an image-only doc is legal with text: ""', () => {
  const { text, error } = validateDoc({ blocks: [{ type: 'img', id: ID }] });

  assert.strictEqual(error, undefined);
  assert.strictEqual(text, '');
});

test('an empty doc, and one holding only empty paragraphs, are rejected', () => {
  assert.ok(validateDoc({ blocks: [] }).error);
  assert.ok(validateDoc({ blocks: [{ type: 'p', spans: [] }, { type: 'p', spans: [{ text: '' }] }] }).error);
});

test('a non-doc is rejected rather than crashing', () => {
  for (const raw of [null, undefined, 'טקסט', 42, {}, { blocks: 'לא מערך' }]) {
    assert.ok(validateDoc(raw).error, `expected ${JSON.stringify(raw)} to be rejected`);
  }
});

test('unknown block types and unknown marks are rejected', () => {
  assert.ok(validateDoc({ blocks: [{ type: 'script', spans: [] }] }).error);
  assert.ok(validateDoc({ blocks: [{ type: 'p', spans: [{ text: 'א', marks: ['blink'] }] }] }).error);
});

// The whole safety argument of the model: these are not filtered out, they are
// unrepresentable. If any of them ever passes, the renderer is building a URL from
// attacker input.
test('only a file this server could have written is accepted as an image id', () => {
  const bad = [
    'https://example.com/track.gif',
    '../../data/content.json',
    '3f2b1a0c-4d5e-6f70-8192-a3b4c5d6e7f8.svg',
    '3f2b1a0c-4d5e-6f70-8192-a3b4c5d6e7f8',
    'javascript:alert(1)',
    '',
  ];
  for (const id of bad) {
    assert.ok(validateDoc({ blocks: [{ type: 'img', id }] }).error, `expected ${id} to be rejected`);
  }
  assert.strictEqual(validateDoc({ blocks: [{ type: 'img', id: ID }] }).error, undefined);
});

test('each limit is enforced', () => {
  const long = { blocks: [p('א'.repeat(MAX_TEXT + 1))] };
  assert.ok(validateDoc(long).error.includes(String(MAX_TEXT)));

  const many = { blocks: Array.from({ length: MAX_BLOCKS + 1 }, (_, i) => p(String(i))) };
  assert.ok(validateDoc(many).error.includes(String(MAX_BLOCKS)));

  const images = { blocks: Array.from({ length: MAX_IMAGES + 1 }, () => ({ type: 'img', id: ID })) };
  assert.ok(validateDoc(images).error.includes(String(MAX_IMAGES)));

  assert.ok(validateDoc({ blocks: [{ type: 'img', id: ID, alt: 'א'.repeat(101) }] }).error);
});

test('empty paragraphs and empty list items are dropped, not rejected', () => {
  const { doc, error } = validateDoc({
    blocks: [{ type: 'p', spans: [] }, p('שלום'), { type: 'ul', items: [[], [{ text: 'א' }]] }],
  });

  assert.strictEqual(error, undefined);
  assert.deepStrictEqual(doc.blocks.map((b) => b.type), ['p', 'ul']);
  assert.strictEqual(doc.blocks[1].items.length, 1);
});

test('marks are normalised to a fixed order and de-duplicated', () => {
  const { doc } = validateDoc({ blocks: [{ type: 'p', spans: [{ text: 'א', marks: ['u', 'b', 'b'] }] }] });
  assert.deepStrictEqual(doc.blocks[0].spans[0].marks, ['b', 'u']);
});

test('fields outside the model are stripped rather than stored', () => {
  const { doc } = validateDoc({
    blocks: [{ type: 'p', spans: [{ text: 'א', style: 'color:red' }], onclick: 'x' }],
    extra: 'nope',
  });

  assert.deepStrictEqual(doc, { blocks: [{ type: 'p', spans: [{ text: 'א' }] }] });
});
