import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getContent } from '../../services/content';
import { PANEL_META, PANEL_KEYS } from './panelMeta';
import * as S from './adminStyles';

export default function AdminHome() {
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getContent()
      .then((doc) =>
        setCounts(Object.fromEntries(PANEL_KEYS.map((key) => [key, (doc[key] || []).length])))
      )
      .catch(() => setError('לא ניתן להתחבר לשרת'));
  }, []);

  return (
    <div style={S.screen}>
      <h1 style={S.title}>ניהול תוכן</h1>
      {error && <div style={S.error}>{error}</div>}

      {PANEL_KEYS.map((key) => (
        <Link key={key} to={`/adminGabbai/${key}`} style={S.row}>
          <span style={{ fontSize: '26px' }}>{PANEL_META[key].icon}</span>
          <span style={{ flex: 1, fontSize: '19px', fontWeight: 600 }}>{PANEL_META[key].title}</span>
          <span style={{ color: S.COLORS.gold, fontSize: '18px' }}>
            {counts ? counts[key] : '…'}
          </span>
          <span style={S.muted}>‹</span>
        </Link>
      ))}

      {/* A single record rather than a list, so it carries no count and has its own screen. */}
      <Link to="/adminGabbai/settings" style={{ ...S.row, marginTop: '18px' }}>
        <span style={{ fontSize: '26px' }}>🕯</span>
        <span style={{ flex: 1, fontSize: '19px', fontWeight: 600 }}>זמני שבת</span>
        <span style={S.muted}>‹</span>
      </Link>
    </div>
  );
}
