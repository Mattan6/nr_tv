import { useEffect, useRef, useState } from 'react';
import RichDoc from '../../components/RichDoc';
import { uploadImage } from '../../services/uploads';
import { docToNodes, domToDoc } from './richText';
import * as S from './adminStyles';

// execCommand is marked deprecated and has no replacement for this job. Every browser
// still implements it — the TV stick's Chrome and the gabbai's phone included — and
// hand-rolling selection handling is how a six-button editor becomes a large one.
const COMMANDS = [
  { command: 'bold', label: 'B', title: 'מודגש', style: { fontWeight: 800 } },
  { command: 'italic', label: 'I', title: 'נטוי', style: { fontStyle: 'italic' } },
  { command: 'underline', label: 'U', title: 'קו תחתון', style: { textDecoration: 'underline' } },
  { command: 'insertUnorderedList', label: '•', title: 'רשימה' },
  { command: 'insertOrderedList', label: '1.', title: 'רשימה ממוספרת' },
];

const toolButton = {
  minWidth: '44px',
  minHeight: '44px',
  border: `1px solid ${S.COLORS.border}`,
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.05)',
  color: S.COLORS.text,
  fontSize: '17px',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

// execCommand('insertImage') sets a src but cannot set our data-img-id, and no command
// inserts an element with attributes. So the node goes in through the selection — and
// when there is none, because the gabbai tapped the button before typing anything, at the
// end of the editor.
function insertNode(root, node) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !root.contains(selection.anchorNode)) {
    root.appendChild(node);
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export default function RichTextEditor({ value, onChange, disabled }) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  // Read once, in the mount effect below. Reading `value` there directly would make it a
  // dependency and reload the DOM on every keystroke.
  const initial = useRef(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Mount only. After this the contentEditable DOM is the state and `value` travels
  // outward; re-writing it from props on every change would put the caret back at the
  // start on every keystroke. ItemForm remounts this component, via `key`, when a
  // genuinely different item finishes loading.
  useEffect(() => {
    if (ref.current) ref.current.replaceChildren(...docToNodes(initial.current));
  }, []);

  const emit = () => {
    if (ref.current) onChange(domToDoc(ref.current));
  };

  const run = (command) => {
    if (disabled) return;
    ref.current?.focus();
    document.execCommand(command, false, null);
    emit();
  };

  // Paste as plain text. The walker drops unknown formatting at save time anyway; without
  // this the editor would show Word's colours and fonts right up until the save silently
  // removed them, which reads as the save being broken.
  const onPaste = (event) => {
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    emit();
  };

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    // Cleared so choosing the same file twice fires the change event again.
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    setError('');
    try {
      const id = await uploadImage(file);
      const img = document.createElement('img');
      img.src = `/api/uploads/${id}`;
      img.setAttribute('data-img-id', id);
      img.alt = '';
      img.style.maxWidth = '100%';
      ref.current?.focus();
      insertNode(ref.current, img);
      emit();
    } catch (err) {
      setError(err.response?.data?.message || 'העלאת התמונה נכשלה');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {COMMANDS.map((item) => (
          <button
            key={item.command}
            type="button"
            title={item.title}
            aria-label={item.title}
            disabled={disabled}
            // onMouseDown, not onClick: a click would blur the editor first and the
            // selection the command is meant to act on would already be gone.
            onMouseDown={(event) => {
              event.preventDefault();
              run(item.command);
            }}
            style={{ ...toolButton, ...item.style, opacity: disabled ? 0.6 : 1 }}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          title="הוסף תמונה"
          disabled={disabled || busy}
          onClick={() => fileRef.current?.click()}
          style={{ ...toolButton, width: 'auto', padding: '0 14px', opacity: disabled || busy ? 0.6 : 1 }}
        >
          {busy ? 'מעלה…' : '🖼 תמונה'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={onFile}
          style={{ display: 'none' }}
        />
      </div>

      {error && <div style={S.fieldError}>{error}</div>}

      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emit}
        onPaste={onPaste}
        style={{ ...S.input, minHeight: '150px', textAlign: 'start', lineHeight: 1.5, opacity: disabled ? 0.6 : 1 }}
      />

      <div style={{ ...S.label, marginTop: '14px' }}>כך זה ייראה על הלוח</div>
      {/* The board's box is 900x330 and its text is clipped there with nothing to warn
          him, while the editor above is wide and light. So the preview is the display's
          own component, on the board's background, at the board's proportions. */}
      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          height: '132px',
          overflow: 'hidden',
          borderRadius: '12px',
          border: `1px solid ${S.COLORS.border}`,
          background: '#0d121d',
        }}
      >
        <div
          style={{
            width: '900px',
            height: '330px',
            transform: 'scale(0.4)',
            transformOrigin: 'top right',
            boxSizing: 'border-box',
            padding: '16px 26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '31px',
            fontWeight: 600,
            lineHeight: 1.45,
            textAlign: 'center',
            color: '#eef2f7',
          }}
        >
          <RichDoc doc={value} />
        </div>
      </div>
    </div>
  );
}
