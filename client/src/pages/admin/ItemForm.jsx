import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getPanel, createItem, updateItem } from '../../services/content';
import { PANEL_META } from './panelMeta';
import RichTextEditor from './RichTextEditor';
import { docFromPlainText, emptyDoc } from './richText';
import * as S from './adminStyles';

// What a field holds before the gabbai touches it — for a new item, and for a stored one whose
// field is empty.
//
// A select resolves to its FIRST OPTION rather than to '', and that is not cosmetic. A
// <select> cannot display an empty value, so it would show the first option regardless while
// state still held '' — and the save would then send '' for a field the gabbai watched say
// 'מכירה פומבית'. The board reads a blank as the same default, so nothing looks wrong on the
// wall; the stored item just quietly disagrees with the form that wrote it, and says so the
// next time anyone opens it. Resolving here keeps state and display the same value.
const initialValue = (field, item) => {
  // A legacy announcement has no doc. Converting it here is the whole migration: the next
  // save stores it as one.
  if (field.type === 'rich') return item ? item.doc || docFromPlainText(item.text) : emptyDoc();
  const stored = item ? item[field.key] : '';
  if (field.type === 'select') return stored || field.options[0].value;
  return stored || '';
};

const blankValues = (meta) =>
  Object.fromEntries((meta?.fields || []).map((field) => [field.key, initialValue(field, null)]));

export default function ItemForm() {
  const { panel, id } = useParams();
  const navigate = useNavigate();
  const meta = PANEL_META[panel];
  const isNew = !id;

  const [values, setValues] = useState(() => blankValues(meta));
  const [item, setItem] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  // Starts true on an edit route (there is something to load) and false on "new"
  // (there is nothing to fetch, so the form must stay immediately usable).
  const [loading, setLoading] = useState(!isNew);

  // On an edit route the form must stay unusable until `item` is actually loaded —
  // otherwise the gabbai can type into the still-blank fields during the fetch (or
  // after it fails / 404s) and submit before `item` is set, which would send an
  // explicit isActive: true and silently un-hide a hidden item. See `disabled` below.
  useEffect(() => {
    if (!meta || isNew) return;
    // setLoading/setItem/setMessage are deferred into a microtask (rather than called
    // as bare statements here) to satisfy react-hooks/set-state-in-effect, matching
    // PanelList.jsx's approach. The fetch is a real network round trip, so the extra
    // microtask tick is not observable.
    Promise.resolve()
      .then(() => {
        setLoading(true);
        setItem(null);
        setMessage('');
      })
      .then(() => getPanel(panel))
      .then((list) => {
        const found = list.find((it) => it.id === id);
        if (!found) {
          setMessage('הפריט לא נמצא');
          return;
        }
        setItem(found);
        setValues(Object.fromEntries(meta.fields.map((f) => [f.key, initialValue(f, found)])));
      })
      .catch(() => setMessage('לא ניתן לטעון את הפריט'))
      .finally(() => setLoading(false));
  }, [panel, id, isNew, meta]);

  if (!meta) {
    return (
      <div style={S.screen}>
        <Link to="/adminGabbai" style={S.backLink}>‹ חזרה</Link>
        <p style={S.muted}>פאנל לא קיים</p>
      </div>
    );
  }

  const setField = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  // On an edit route, disabled until the real item has loaded — there is no valid
  // item to save before then, and the messages above already explain why (not found /
  // failed to load). The "new" route has nothing to load, so it is never held here.
  const disabled = saving || (!isNew && !item);

  const submit = async (event) => {
    event.preventDefault();
    if (disabled) return;
    setSaving(true);
    setFieldErrors({});
    setMessage('');

    // An edit must not silently un-hide a hidden item.
    const payload = { ...values, isActive: item ? item.isActive : true };

    try {
      if (isNew) await createItem(panel, payload);
      else await updateItem(panel, id, payload);
      navigate(`/adminGabbai/${panel}`);
    } catch (error) {
      // `values` is deliberately untouched — the gabbai never loses what he typed.
      const status = error.response?.status;
      const data = error.response?.data;
      setFieldErrors(data?.errors || {});
      // The server's `message` is only trustworthy Hebrew on a 400 — that's the
      // validation path the Hebrew strings in panels.js/contentController.js were
      // written for. Every other status (500, a proxy's plain-text error, etc.) falls
      // back to our own Hebrew message instead of showing English inside an RTL UI.
      setMessage((status === 400 && data?.message) || 'השמירה נכשלה — בדוק את החיבור לשרת');
      setSaving(false);
    }
  };

  return (
    <div style={S.screen}>
      {/* Back to the LIST, not to the board: the gabbai came from the list and usually has
          another row to add after this one. */}
      <Link to={`/adminGabbai/${panel}`} style={S.backLink}>‹ חזרה</Link>
      <h1 style={S.title}>{isNew ? meta.addLabel : `עריכת ${meta.title}`}</h1>
      {message && <div style={S.error}>{message}</div>}
      {loading && <p style={S.muted}>טוען…</p>}

      <form onSubmit={submit}>
        {meta.fields.map((field) => (
          <div key={field.key} style={{ marginBottom: '16px' }}>
            <label style={S.label} htmlFor={field.type === 'rich' ? undefined : field.key}>
              {field.label}
              {!field.required && ' (לא חובה)'}
            </label>
            {field.type === 'rich' ? (
              <RichTextEditor
                // Remounts when the fetched item arrives, which is how the editor loads a
                // document exactly once instead of on every keystroke.
                key={item?.id || 'new'}
                value={values[field.key]}
                onChange={(doc) => setField(field.key, doc)}
                disabled={disabled}
              />
            ) : field.type === 'select' ? (
              // Native, not a custom listbox: this admin is used on a phone, and a native
              // select gets the platform's own picker — a full-height wheel on iOS — for free.
              //
              // No `|| options[0].value` fallback here on purpose: initialValue already
              // resolved it, so what the gabbai sees is exactly what will be saved.
              <select
                id={field.key}
                value={values[field.key]}
                onChange={(e) => setField(field.key, e.target.value)}
                disabled={disabled}
                style={{ ...S.input, opacity: disabled ? 0.6 : 1 }}
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                id={field.key}
                value={values[field.key]}
                placeholder={field.placeholder || ''}
                onChange={(e) => setField(field.key, e.target.value)}
                rows={4}
                disabled={disabled}
                style={{ ...S.input, resize: 'vertical', opacity: disabled ? 0.6 : 1 }}
              />
            ) : (
              <input
                id={field.key}
                type={field.type}
                value={values[field.key]}
                placeholder={field.placeholder || ''}
                onChange={(e) => setField(field.key, e.target.value)}
                disabled={disabled}
                style={{ ...S.input, opacity: disabled ? 0.6 : 1 }}
              />
            )}
            {fieldErrors[field.key] && <div style={S.fieldError}>{fieldErrors[field.key]}</div>}
          </div>
        ))}

        <button type="submit" disabled={disabled} style={{ ...S.primaryButton, opacity: disabled ? 0.6 : 1 }}>
          {saving ? 'שומר…' : 'שמור'}
        </button>
      </form>
    </div>
  );
}
