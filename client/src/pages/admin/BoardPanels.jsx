import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getContent } from '../../services/content';
import { PANEL_META } from './panelMeta';
import { BOARD_BY_ID } from './boards';
import { SETTINGS_META } from './timesMeta';
import * as S from './adminStyles';

// One board's panels, with a count each — the screen the old flat AdminHome became.
//
// The counts come from ONE getContent() rather than a request per panel: the document is a few
// kilobytes and the admin is used on a phone over the shul's wifi, so five round trips to
// display five numbers is the wrong trade.
export default function BoardPanels() {
  const { board: boardId } = useParams();
  const board = BOARD_BY_ID[boardId];
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!board) return undefined;
    let cancelled = false;

    getContent()
      .then((doc) => {
        if (cancelled) return;
        setCounts(Object.fromEntries(board.panels.map((key) => [key, (doc[key] || []).length])));
      })
      .catch(() => {
        if (!cancelled) setError('לא ניתן להתחבר לשרת');
      });

    return () => {
      cancelled = true;
    };
    // `board` rather than `boardId`: react-router reuses this component across
    // /adminGabbai/board/:board changes, and the panel list to count comes off the object.
  }, [board]);

  if (!board) {
    return (
      <div style={S.screen}>
        <Link to="/adminGabbai" style={S.backLink}>‹ חזרה</Link>
        <p style={S.muted}>לוח לא קיים</p>
      </div>
    );
  }

  const settings = board.settings ? SETTINGS_META[board.settings] : null;

  return (
    <div style={S.screen}>
      <Link to="/adminGabbai" style={S.backLink}>‹ חזרה</Link>
      <h1 style={S.title}>{board.title}</h1>
      {error && <div style={S.error}>{error}</div>}

      {board.panels.map((key) => (
        <Link key={key} to={`/adminGabbai/${key}`} style={S.row}>
          <span style={{ fontSize: '26px' }}>{PANEL_META[key].icon}</span>
          <span style={{ flex: 1, fontSize: '19px', fontWeight: 600 }}>{PANEL_META[key].title}</span>
          <span style={{ color: S.COLORS.gold, fontSize: '18px' }}>{counts ? counts[key] : '…'}</span>
          <span style={S.muted}>‹</span>
        </Link>
      ))}

      {/* A single record rather than a list, so it carries no count and has its own screen. */}
      {settings && (
        <Link to={`/adminGabbai/settings/${board.settings}`} style={{ ...S.row, marginTop: '18px' }}>
          <span style={{ fontSize: '26px' }}>{settings.icon}</span>
          <span style={{ flex: 1, fontSize: '19px', fontWeight: 600 }}>{settings.title}</span>
          <span style={S.muted}>‹</span>
        </Link>
      )}
    </div>
  );
}
