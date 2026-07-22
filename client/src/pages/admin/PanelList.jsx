import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPanel, updateItem, deleteItem } from '../../services/content';
import { PANEL_META } from './panelMeta';
import * as S from './adminStyles';

export default function PanelList() {
  const { panel } = useParams();
  const meta = PANEL_META[panel];
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meta) return;
    // setLoading(true) is deferred into a microtask (rather than called as a bare
    // statement here) to satisfy react-hooks/set-state-in-effect, which flags
    // synchronous setState calls in an effect body. The fetch is a real network
    // round trip, so the extra microtask tick is not observable.
    Promise.resolve()
      // Clearing the error here matters because react-router reuses this component
      // across /adminGabbai/:panel changes (back/forward, or an edited URL). Without
      // it, a failed save on one panel keeps its Hebrew error on screen after the
      // next panel loads successfully.
      .then(() => {
        setLoading(true);
        setError('');
      })
      .then(() => getPanel(panel))
      .then(setItems)
      .catch(() => setError('לא ניתן לטעון את הרשימה'))
      .finally(() => setLoading(false));
  }, [panel, meta]);

  if (!meta) {
    return (
      <div style={S.screen}>
        <Link to="/adminGabbai" style={S.backLink}>‹ חזרה</Link>
        <p style={S.muted}>פאנל לא קיים</p>
      </div>
    );
  }

  // Optimistic: the switch flips immediately and rolls back if the save fails, so a
  // dead network cannot leave the screen disagreeing with the server.
  const toggle = async (item) => {
    const next = { ...item, isActive: !item.isActive };
    setItems((list) => list.map((it) => (it.id === item.id ? next : it)));
    setError('');
    try {
      await updateItem(panel, item.id, next);
    } catch {
      setItems((list) => list.map((it) => (it.id === item.id ? item : it)));
      setError('השינוי לא נשמר');
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`למחוק את "${meta.summary(item)}"?`)) return;
    setError('');
    try {
      await deleteItem(panel, item.id);
      setItems((list) => list.filter((it) => it.id !== item.id));
    } catch {
      setError('המחיקה נכשלה');
    }
  };

  return (
    <div style={S.screen}>
      <Link to="/adminGabbai" style={S.backLink}>‹ חזרה</Link>
      <h1 style={S.title}>{meta.title}</h1>
      {error && <div style={S.error}>{error}</div>}

      {loading && <p style={S.muted}>טוען…</p>}
      {!loading && items.length === 0 && <p style={S.muted}>{meta.emptyLabel}</p>}

      {items.map((item) => (
        <div key={item.id} style={{ ...S.card, opacity: item.isActive ? 1 : 0.45 }}>
          <div style={{ fontSize: '18px', fontWeight: 600, whiteSpace: 'pre-line', lineHeight: 1.35 }}>
            {meta.summary(item)}
          </div>
          {meta.sub(item) && (
            <div style={{ ...S.muted, marginTop: '4px' }}>{meta.sub(item)}</div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, fontSize: '16px' }}>
              <input
                type="checkbox"
                checked={item.isActive}
                onChange={() => toggle(item)}
                style={{ width: '22px', height: '22px', accentColor: S.COLORS.gold }}
              />
              {item.isActive ? 'מוצג' : 'מוסתר'}
            </label>
            <Link to={`/adminGabbai/${panel}/${item.id}`} style={{ ...S.button, textDecoration: 'none' }}>
              ✎ ערוך
            </Link>
            <button type="button" onClick={() => remove(item)} style={S.dangerButton}>
              🗑
            </button>
          </div>
        </div>
      ))}

      <Link to={`/adminGabbai/${panel}/new`} style={{ ...S.primaryButton, display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '18px' }}>
        + {meta.addLabel}
      </Link>
    </div>
  );
}
