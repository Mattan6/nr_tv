import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getPanel, createItem, updateItem } from '../../services/content';
import { PANEL_META } from './panelMeta';
import * as S from './adminStyles';

const blankValues = (meta) =>
  Object.fromEntries((meta?.fields || []).map((field) => [field.key, '']));

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

  useEffect(() => {
    if (!meta || isNew) return;
    getPanel(panel)
      .then((list) => {
        const found = list.find((it) => it.id === id);
        if (!found) {
          setMessage('הפריט לא נמצא');
          return;
        }
        setItem(found);
        setValues(Object.fromEntries(meta.fields.map((f) => [f.key, found[f.key] || ''])));
      })
      .catch(() => setMessage('לא ניתן לטעון את הפריט'));
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

  const submit = async (event) => {
    event.preventDefault();
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
      const data = error.response?.data;
      setFieldErrors(data?.errors || {});
      setMessage(data?.message || 'השמירה נכשלה — בדוק את החיבור לשרת');
      setSaving(false);
    }
  };

  return (
    <div style={S.screen}>
      <Link to={`/adminGabbai/${panel}`} style={S.backLink}>‹ חזרה</Link>
      <h1 style={S.title}>{isNew ? meta.addLabel : `עריכת ${meta.title}`}</h1>
      {message && <div style={S.error}>{message}</div>}

      <form onSubmit={submit}>
        {meta.fields.map((field) => (
          <div key={field.key} style={{ marginBottom: '16px' }}>
            <label style={S.label} htmlFor={field.key}>
              {field.label}
              {!field.required && ' (לא חובה)'}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                id={field.key}
                value={values[field.key]}
                placeholder={field.placeholder || ''}
                onChange={(e) => setField(field.key, e.target.value)}
                rows={4}
                style={{ ...S.input, resize: 'vertical' }}
              />
            ) : (
              <input
                id={field.key}
                type={field.type}
                value={values[field.key]}
                placeholder={field.placeholder || ''}
                onChange={(e) => setField(field.key, e.target.value)}
                style={S.input}
              />
            )}
            {fieldErrors[field.key] && <div style={S.fieldError}>{fieldErrors[field.key]}</div>}
          </div>
        ))}

        <button type="submit" disabled={saving} style={{ ...S.primaryButton, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'שומר…' : 'שמור'}
        </button>
      </form>
    </div>
  );
}
