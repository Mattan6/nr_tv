import test from 'node:test';
import assert from 'node:assert/strict';
import { domToDoc, docFromPlainText } from '../src/pages/Admin/richText.js';

// Fake DOM nodes. domToDoc reads only these five properties, which is the whole reason
// this file needs no jsdom.
const text = (value) => ({ nodeType: 3, textContent: value, childNodes: [] });
const el = (nodeName, childNodes = [], attrs = {}) => ({
  nodeType: 1,
  nodeName,
  childNodes,
  getAttribute: (name) => (name in attrs ? attrs[name] : null),
});
const root = (childNodes) => ({ childNodes });

test('plain paragraphs become paragraph blocks', () => {
  const doc = domToDoc(root([el('DIV', [text('שורה ראשונה')]), el('DIV', [text('שורה שנייה')])]));

  assert.deepEqual(doc.blocks, [
    { type: 'p', spans: [{ text: 'שורה ראשונה' }] },
    { type: 'p', spans: [{ text: 'שורה שנייה' }] },
  ]);
});

test('nested marks accumulate', () => {
  const doc = domToDoc(root([el('DIV', [el('B', [el('I', [text('חשוב')])])])]));

  assert.deepEqual(doc.blocks[0].spans, [{ text: 'חשוב', marks: ['b', 'i'] }]);
});

test('STRONG and EM are the same marks as B and I', () => {
  const doc = domToDoc(root([el('DIV', [el('STRONG', [text('א')]), el('EM', [text('ב')])])]));

  assert.deepEqual(doc.blocks[0].spans, [
    { text: 'א', marks: ['b'] },
    { text: 'ב', marks: ['i'] },
  ]);
});

// The whitelist in one test: what Word actually pastes.
test('a paste from Word keeps its text and loses its formatting', () => {
  const doc = domToDoc(
    root([
      el('DIV', [
        el('SPAN', [el('FONT', [text('הודעה חשובה')], { color: '#ff0000' })], {
          style: 'font-size:48pt;color:#c00',
          class: 'MsoNormal',
        }),
      ]),
    ])
  );

  assert.deepEqual(doc.blocks, [{ type: 'p', spans: [{ text: 'הודעה חשובה' }] }]);
});

test('a link keeps its text and stops being a link', () => {
  const doc = domToDoc(root([el('DIV', [el('A', [text('לחץ כאן')], { href: 'javascript:alert(1)' })])]));

  assert.deepEqual(doc.blocks, [{ type: 'p', spans: [{ text: 'לחץ כאן' }] }]);
});

test('adjacent spans with identical marks are merged', () => {
  const doc = domToDoc(root([el('DIV', [el('B', [text('של')]), el('B', [text('ום')])])]));

  assert.deepEqual(doc.blocks[0].spans, [{ text: 'שלום', marks: ['b'] }]);
});

test('a BR ends the paragraph', () => {
  const doc = domToDoc(root([el('DIV', [text('ראשונה'), el('BR'), text('שנייה')])]));

  assert.deepEqual(doc.blocks, [
    { type: 'p', spans: [{ text: 'ראשונה' }] },
    { type: 'p', spans: [{ text: 'שנייה' }] },
  ]);
});

test('empty paragraphs are collapsed away', () => {
  const doc = domToDoc(root([el('DIV', [text('א')]), el('DIV', []), el('DIV', [el('BR')]), el('DIV', [text('ב')])]));

  assert.deepEqual(doc.blocks, [
    { type: 'p', spans: [{ text: 'א' }] },
    { type: 'p', spans: [{ text: 'ב' }] },
  ]);
});

test('lists become list blocks and keep their marks', () => {
  const doc = domToDoc(
    root([
      el('UL', [el('LI', [text('רגיל')]), el('LI', [el('B', [text('מודגש')])]), el('LI', [])]),
      el('OL', [el('LI', [text('ראשון')])]),
    ])
  );

  assert.deepEqual(doc.blocks, [
    { type: 'ul', items: [[{ text: 'רגיל' }], [{ text: 'מודגש', marks: ['b'] }]] },
    { type: 'ol', items: [[{ text: 'ראשון' }]] },
  ]);
});

test('a BR inside a list item does not break the list apart', () => {
  const doc = domToDoc(root([el('UL', [el('LI', [text('א'), el('BR'), text('ב')])])]));

  assert.deepEqual(doc.blocks, [{ type: 'ul', items: [[{ text: 'אב' }]] }]);
});

test('an image with our id becomes an image block', () => {
  const id = '3f2b1a0c-4d5e-6f70-8192-a3b4c5d6e7f8.jpg';
  const doc = domToDoc(
    root([el('DIV', [text('לפני')]), el('IMG', [], { 'data-img-id': id, alt: 'מודעה' }), el('DIV', [text('אחרי')])])
  );

  assert.deepEqual(doc.blocks, [
    { type: 'p', spans: [{ text: 'לפני' }] },
    { type: 'img', id, alt: 'מודעה' },
    { type: 'p', spans: [{ text: 'אחרי' }] },
  ]);
});

// A picture dragged in from a web page has a src we do not host and no file behind it.
test('an image without our id is dropped', () => {
  const doc = domToDoc(root([el('IMG', [], { src: 'https://example.com/x.png' }), el('DIV', [text('טקסט')])]));

  assert.deepEqual(doc.blocks, [{ type: 'p', spans: [{ text: 'טקסט' }] }]);
});

test('an empty editor yields a doc with no blocks, which the server calls required', () => {
  assert.deepEqual(domToDoc(root([])).blocks, []);
  assert.deepEqual(domToDoc(root([el('DIV', [el('BR')])])).blocks, []);
});

test('docFromPlainText turns a legacy announcement into paragraphs', () => {
  assert.deepEqual(docFromPlainText('שורה\nשנייה'), {
    blocks: [
      { type: 'p', spans: [{ text: 'שורה' }] },
      { type: 'p', spans: [{ text: 'שנייה' }] },
    ],
  });
  assert.deepEqual(docFromPlainText(''), { blocks: [] });
  assert.deepEqual(docFromPlainText(undefined), { blocks: [] });
});
