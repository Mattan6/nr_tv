import { PANEL_META } from './panelMeta';

// Which board each panel belongs to, and the order both levels of the admin are listed in.
//
// A CLIENT-side registry: the server knows nothing about boards. `PANELS` there stays flat and
// `PANEL_KEYS` stays a flat array, because grouping is presentation — the same reasoning that
// has panelMeta.js own the Hebrew rather than deriving it from the schema.
//
// This is the file a future חג board adds ONE line to. יום כיפור, סוכות, פסח and שבועות each
// need their own panel schemas, their own seeds and their own layout; none of them needs a new
// route, a new controller, or a new admin screen.
//
// `settings` names the group in content.json's `settings` record, and is what puts the
// ⏰ זמנים row on that board's screen. A board without pinnable times simply omits it.
export const BOARDS = [
  // First, and holding the panels the gabbai edits weekly. The חג boards below are the ones he
  // touches twice a year, so putting כללי at the top keeps the daily work one tap from home.
  {
    id: 'general',
    title: 'כללי',
    icon: '🗂',
    panels: ['announcements', 'mazal', 'azkarot', 'ticker'],
  },
  { id: 'weekday', title: 'חול', icon: '📅', panels: ['shiurim'] },
  {
    id: 'shabbat',
    title: 'שבת',
    icon: '🕯',
    panels: ['shiurimShabbat', 'dedication'],
    settings: 'shabbat',
  },
  {
    id: 'rosh',
    title: 'ראש השנה',
    icon: '🍎',
    panels: ['roshDay1', 'roshDay2', 'roshMechirot', 'roshDedication', 'roshTicker'],
    settings: 'rosh',
  },
];

export const BOARD_BY_ID = Object.fromEntries(BOARDS.map((b) => [b.id, b]));

// Which board a panel screen sends its ‹ חזרה link back to.
//
// A panel listed in no board returns null and the caller falls back to the admin home, so a
// key added to panelMeta but not yet to a board is a slightly long way back rather than a
// broken link.
export const boardOfPanel = (panel) => BOARDS.find((b) => b.panels.includes(panel))?.id || null;

// Every panel a board lists has to exist in PANEL_META, or the board screen renders a row that
// leads to "פאנל לא קיים" — and it would be a row with a blank title and a blank icon, so the
// mistake is invisible until someone taps it. Cheap to assert at module load, and it only ever
// costs anything in dev.
if (import.meta.env?.DEV) {
  for (const board of BOARDS) {
    for (const panel of board.panels) {
      if (!PANEL_META[panel]) {
        console.error(`boards.js: הלוח "${board.id}" מפנה לפאנל שלא קיים ב-panelMeta: "${panel}"`);
      }
    }
  }
}
