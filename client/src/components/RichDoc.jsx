import { Fragment } from 'react';

// The one renderer for an announcement's rich document: the weekday board, the phone and
// the admin's preview all draw through this. The admin preview using the display's own
// component — rather than a lookalike — is what makes it trustworthy.
//
// The שבת board deliberately does not use it and keeps its own plain-text render; see the
// spec. That it could, unchanged, follows from the next paragraph.
//
// It takes no colour and no size from the data. The surface around it owns typography,
// which is why the same component sits on a dark panel, in a phone card and inside a
// scaled preview with no theme prop — and why the gabbai cannot make the text unreadable
// from the back of the hall.

const IMAGE_BASE = '/api/uploads/';

const TAG_BY_MARK = { b: 'strong', i: 'em', u: 'u' };

const renderSpans = (spans) =>
  spans.map((span, index) => {
    let node = span.text;
    for (const mark of span.marks || []) {
      const Tag = TAG_BY_MARK[mark];
      node = <Tag>{node}</Tag>;
    }
    return <Fragment key={index}>{node}</Fragment>;
  });

const RichDoc = ({ doc, text, imageMaxHeight = '55%' }) => {
  // No doc — an announcement written before rich content existed, or one whose rich
  // content was cleared by a legacy write. Rendered exactly as it always was; this line
  // is the whole backward-compatibility story on the display side.
  if (!doc?.blocks?.length) {
    return <div style={{ whiteSpace: 'pre-line' }}>{text || ''}</div>;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        maxHeight: '100%',
        minHeight: 0,
      }}
    >
      {doc.blocks.map((block, index) => {
        if (block.type === 'img') {
          return (
            <img
              key={index}
              src={`${IMAGE_BASE}${block.id}`}
              alt={block.alt || ''}
              // The ceiling is what keeps a picture from pushing the text out of a box
              // whose height is fixed by the board's grid: the image shrinks instead.
              style={{
                maxWidth: '100%',
                maxHeight: imageMaxHeight,
                objectFit: 'contain',
                borderRadius: '10px',
                minHeight: 0,
              }}
            />
          );
        }

        if (block.type === 'ul' || block.type === 'ol') {
          const List = block.type;
          return (
            <List key={index} style={{ margin: 0, paddingInlineStart: '1.2em', textAlign: 'start' }}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderSpans(item)}</li>
              ))}
            </List>
          );
        }

        return (
          <p key={index} style={{ margin: 0 }}>
            {renderSpans(block.spans)}
          </p>
        );
      })}
    </div>
  );
};

export default RichDoc;
