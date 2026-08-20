import { Link } from 'react-router-dom';
import { BOARDS } from './boards';
import * as S from './adminStyles';

// The admin's first level: which board, not which panel.
//
// It was a flat list of every panel until ראש השנה arrived. That does not survive the boards
// coming after it — יום כיפור, סוכות, פסח and שבועות would push it past twenty rows on a phone
// — so the level exists now, while there are four boards to shake it out on rather than eight.
//
// No counts here, deliberately. A board has no single number, and fetching the whole document
// to sum five panels would make the very first screen wait on a request it has nothing to show
// from. The counts live one level down, on BoardPanels, where each one means something.
export default function AdminHome() {
  return (
    <div style={S.screen}>
      <h1 style={S.title}>ניהול תוכן</h1>

      {BOARDS.map((board) => (
        <Link key={board.id} to={`/adminGabbai/board/${board.id}`} style={S.row}>
          <span style={{ fontSize: '26px' }}>{board.icon}</span>
          <span style={{ flex: 1, fontSize: '19px', fontWeight: 600 }}>{board.title}</span>
          <span style={S.muted}>‹</span>
        </Link>
      ))}
    </div>
  );
}
