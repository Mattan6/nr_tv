// The bridge between the editor's contentEditable DOM and the stored document.
//
// domToDoc deliberately touches only nodeType, nodeName, childNodes, textContent and
// getAttribute. That is what lets it be tested against plain objects — no jsdom, no
// browser, no new dependency — and it is the reason this file has tests at all. Do not
// reach for classList, style, innerHTML or querySelector here.

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

const MARK_BY_TAG = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u' };
const MARKS = ['b', 'i', 'u'];

export const emptyDoc = () => ({ blocks: [] });

const sameMarks = (a = [], b = []) => a.length === b.length && a.every((mark, i) => mark === b[i]);

// execCommand splits a run into several elements as a matter of course, so <b>של</b><b>ום</b>
// is the normal output rather than an edge case. Merging here keeps the stored document
// from growing a span per keystroke.
function mergeSpans(spans) {
  const out = [];
  for (const span of spans) {
    if (!span.text) continue;
    const marks = MARKS.filter((mark) => span.marks.includes(mark));
    const last = out[out.length - 1];
    if (last && sameMarks(last.marks, marks)) {
      last.text += span.text;
      continue;
    }
    out.push(marks.length ? { text: span.text, marks } : { text: span.text });
  }
  return out;
}

export function domToDoc(root) {
  const blocks = [];
  let para = null;

  // A span is pushed through a function rather than into a captured array: flushing sets
  // `para` to null, and a closure holding the old array would keep filling a paragraph
  // that has already been emitted.
  const pushSpan = (span) => {
    if (!para) para = [];
    para.push(span);
  };

  const flushPara = () => {
    if (!para) return;
    const spans = mergeSpans(para);
    para = null;
    if (spans.length) blocks.push({ type: 'p', spans });
  };

  // Builds the image block itself but does not decide where it lands — that is
  // `onImage`'s job below, because the answer differs at the top level (immediately,
  // in document order) and inside a list (collected, emitted after the list block).
  const image = (node) => {
    const id = node.getAttribute('data-img-id');
    // A picture dragged in from a web page: a src we do not host, with no file of ours
    // behind it. The server would reject it anyway; dropping it here means the gabbai
    // finds out at once rather than at save time.
    if (!id) return null;
    return { type: 'img', id, alt: node.getAttribute('alt') || '' };
  };

  // `sink` receives spans, `onBreak` decides what a <br> means here — a new paragraph at
  // the top level, and nothing at all inside a list item, where a stray break must not
  // push a paragraph into the middle of the list — and `onImage` decides where a found
  // image block is filed; see the two call sites below.
  const inline = (node, marks, sink, onBreak, onImage) => {
    if (node.nodeType === TEXT_NODE) {
      if (node.textContent) sink({ text: node.textContent, marks });
      return;
    }
    if (node.nodeType !== ELEMENT_NODE) return;

    if (node.nodeName === 'BR') return onBreak();
    if (node.nodeName === 'IMG') {
      const img = image(node);
      if (img) onImage(img);
      return;
    }

    const mark = MARK_BY_TAG[node.nodeName];
    const next = mark && !marks.includes(mark) ? [...marks, mark] : marks;
    // Everything not in MARK_BY_TAG — a SPAN carrying Word's inline styles, a FONT, an A,
    // a TABLE — is walked for its text and loses its formatting. A whitelist, so the next
    // version of Word cannot introduce a tag we forgot to blacklist.
    for (const child of node.childNodes) inline(child, next, sink, onBreak, onImage);
  };

  // An image found while walking a list item cannot be pushed into `blocks` the moment
  // it is seen: the list block itself is only pushed once, at the end, after every item
  // has been walked. Pushing immediately would emit the image before the list — the
  // editor's WYSIWYG surface shows it inside the bullet, so the saved doc must agree.
  // Collected here instead, and flushed after the list block, a few lines down.
  const list = (node, type) => {
    const items = [];
    const images = [];
    for (const child of node.childNodes) {
      if (child.nodeType !== ELEMENT_NODE || child.nodeName !== 'LI') continue;
      const spans = [];
      for (const grandchild of child.childNodes) {
        inline(grandchild, [], (span) => spans.push(span), () => {}, (img) => images.push(img));
      }
      const merged = mergeSpans(spans);
      if (merged.length) items.push(merged);
    }
    if (items.length) blocks.push({ type, items });
    for (const img of images) blocks.push(img);
  };

  const block = (node) => {
    if (node.nodeType === ELEMENT_NODE) {
      const tag = node.nodeName;
      if (tag === 'UL' || tag === 'OL') {
        flushPara();
        list(node, tag === 'UL' ? 'ul' : 'ol');
        return;
      }
      if (tag === 'P' || tag === 'DIV') {
        flushPara();
        for (const child of node.childNodes) block(child);
        flushPara();
        return;
      }
    }
    // At the top level an image is pushed the moment it is found — flushing the pending
    // paragraph first — because `blocks` here is already being built in document order.
    inline(node, [], pushSpan, flushPara, (img) => {
      flushPara();
      blocks.push(img);
    });
  };

  for (const child of root.childNodes) block(child);
  flushPara();

  return { blocks };
}

// A legacy announcement — text with newlines and nothing else — becomes paragraphs. Blank
// lines disappear, which is right: with real paragraphs the spacing comes from the layout,
// and a blank line was only ever the textarea's way of asking for it.
export const docFromPlainText = (text) => ({
  blocks: String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ type: 'p', spans: [{ text: line }] })),
});

// Browser only — the editor's one write into the DOM. Built with createElement and
// textContent rather than an HTML string, so there is no escaping step and therefore no
// escaping bug to have.
export function docToNodes(doc) {
  const nodes = [];

  for (const block of doc?.blocks || []) {
    if (block.type === 'img') {
      const img = document.createElement('img');
      img.src = `/api/uploads/${block.id}`;
      img.setAttribute('data-img-id', block.id);
      img.alt = block.alt || '';
      img.style.maxWidth = '100%';
      nodes.push(img);
      continue;
    }

    if (block.type === 'ul' || block.type === 'ol') {
      const list = document.createElement(block.type);
      for (const item of block.items) {
        const li = document.createElement('li');
        for (const span of item) li.appendChild(spanNode(span));
        list.appendChild(li);
      }
      nodes.push(list);
      continue;
    }

    const p = document.createElement('p');
    for (const span of block.spans) p.appendChild(spanNode(span));
    nodes.push(p);
  }

  // contentEditable needs somewhere to put the caret.
  if (!nodes.length) {
    const p = document.createElement('p');
    p.appendChild(document.createElement('br'));
    nodes.push(p);
  }

  return nodes;
}

const TAG_BY_MARK = { b: 'strong', i: 'em', u: 'u' };

function spanNode(span) {
  let node = document.createTextNode(span.text);
  for (const mark of span.marks || []) {
    const wrapper = document.createElement(TAG_BY_MARK[mark]);
    wrapper.appendChild(node);
    node = wrapper;
  }
  return node;
}
