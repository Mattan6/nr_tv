// Presentation for the panels. Mirrors the field keys in
// server/src/store/panels.js; the server owns validation, this owns the Hebrew.
// The duplication is deliberate — deriving one from the other would couple
// validation to UI copy. Adding a field means editing both.
// Shared by the two שיעורים panels, mirroring SHIUR_FIELDS in server/src/store/panels.js.
// Same reasoning as there: one controller and one pair of screens serve both lists, so a
// field that differed between them could only ever be a bug.
const SHIUR_FIELDS = [
  { key: 'name', label: 'שם השיעור', type: 'text', required: true },
  { key: 'time', label: 'שעה', type: 'time', required: true },
  { key: 'by', label: 'מגיד השיעור', type: 'text', required: true },
];

// Shared by the two ראש השנה day panels, mirroring ROSH_ROW_FIELDS in
// server/src/store/panels.js — same reasoning as SHIUR_FIELDS above.
//
// `time` is not required, and the label says so out loud rather than relying on the form's
// automatic "(לא חובה)": several rows on this board genuinely have no time, and a gabbai
// looking at an empty field needs to know that is a valid state and not an unfinished one.
//
// `chazan` is labelled חזן / פרטים because it carries a different thing in each kind of row:
// the חזן on a תפילה, the מגיד שיעור on a שיעור, the גבאי on מכירת מצוות, and the LOCATION on
// תשליך — which is the value the תשליך card prints beside the time.
const ROSH_ROW_FIELDS = [
  { key: 'name', label: 'שם השורה', type: 'text', required: true, placeholder: 'שחרית' },
  { key: 'time', label: 'שעה — אפשר להשאיר ריק', type: 'time', required: false },
  { key: 'chazan', label: 'חזן / פרטים', type: 'text', required: false, placeholder: 'החזן ישובץ בהמשך' },
  {
    // Mirrors ROW_KINDS on the server. Two of these do more than colour the row: `shofar` and
    // `tashlich` are what feed the two cards at the top of the board, so changing a row to one
    // of them moves the card with it.
    key: 'kind',
    label: 'סוג השורה',
    type: 'select',
    required: false,
    options: [
      { value: 'regular', label: 'רגילה' },
      { value: 'shiur', label: 'שיעור / דבר תורה' },
      { value: 'shofar', label: 'תקיעת שופר — מזין את הכרטיס למעלה' },
      { value: 'tashlich', label: 'תשליך — מזין את הכרטיס למעלה' },
      { value: 'piyut', label: 'פיוט / מעמד מיוחד' },
      { value: 'mechirot', label: 'מכירת מצוות' },
    ],
  },
];

const ROSH_ROW_SUMMARY = (item) => (item.time ? `${item.name} · ${item.time}` : item.name);

// Shared by the two dedication panels — שבת and חג — mirroring DEDICATION_FIELDS on the server.
const DEDICATION_FIELDS = [
  { key: 'lead', label: 'נוסח ההקדשה', type: 'text', required: true, placeholder: 'מוקדש להצלחת' },
  { key: 'names', label: 'שם המוקדש', type: 'text', required: true, placeholder: 'משפחת מזוז' },
  { key: 'note', label: 'סיומת', type: 'text', required: false, placeholder: 'בכל העניינים' },
];

export const PANEL_META = {
  announcements: {
    title: 'הודעות',
    icon: '📢',
    addLabel: 'הוסף הודעה',
    emptyLabel: 'אין הודעות',
    // The field key is `doc`, which is also the key the server reports errors under —
    // see the rich branch of validateItem in server/src/store/panels.js.
    fields: [{ key: 'doc', label: 'תוכן ההודעה', type: 'rich', required: true }],
    // An announcement that is only a picture has no derived text; without the fallback
    // the list would show it as a blank row.
    summary: (item) => item.text || '🖼 תמונה',
    sub: () => '',
  },
  // Two שיעורים panels, distinguished by their titles rather than by a field inside one
  // list. The gabbai edits "the שבת list", not "a שיעור with a שבת flag" — and the display
  // picks a whole list per day, so the split matches how both sides already think.
  shiurim: {
    title: 'שיעורי תורה · חול',
    icon: '📖',
    addLabel: 'הוסף שיעור',
    emptyLabel: 'אין שיעורים',
    fields: SHIUR_FIELDS,
    summary: (item) => `${item.name} · ${item.time}`,
    sub: (item) => item.by,
  },
  shiurimShabbat: {
    title: 'שיעורי תורה · שבת',
    icon: '🕯',
    addLabel: 'הוסף שיעור בשבת',
    emptyLabel: 'אין שיעורים בשבת',
    fields: SHIUR_FIELDS,
    summary: (item) => `${item.name} · ${item.time}`,
    sub: (item) => item.by,
  },
  mazal: {
    title: 'שמחות ומזל טוב',
    icon: '🎉',
    addLabel: 'הוסף שמחה',
    emptyLabel: 'אין שמחות',
    fields: [
      { key: 'names', label: 'שם המשפחה', type: 'text', required: true },
      { key: 'occasion', label: 'האירוע', type: 'text', required: true },
    ],
    summary: (item) => item.names,
    sub: (item) => item.occasion,
  },
  azkarot: {
    title: 'לעילוי נשמת',
    icon: '🕯',
    addLabel: 'הוסף אזכרה',
    emptyLabel: 'אין אזכרות',
    fields: [
      { key: 'name', label: 'שם הנפטר', type: 'text', required: true, placeholder: 'משה בן פרטונה ז״ל' },
      { key: 'detail', label: 'הקדשה', type: 'text', required: false, placeholder: 'תנצב״ה' },
      { key: 'date', label: 'תאריך עברי', type: 'text', required: true, placeholder: 'י״ח באלול' },
    ],
    summary: (item) => item.name,
    sub: (item) => [item.detail, item.date].filter(Boolean).join(' · '),
  },
  // הקדשת הלוח, on the שבת board only. Three fields because the card sets them in three
  // different types — see server/src/store/panels.js and shabbat/DedicationCard.jsx. The
  // placeholders carry the phrasing the design was drawn with, so a gabbai adding his first
  // dedication can see the shape of one rather than guess it.
  dedication: {
    title: 'הקדשת לוח השבת',
    icon: '🕍',
    addLabel: 'הוסף הקדשה',
    emptyLabel: 'אין הקדשה — הלוח יזמין לפנות לגבאי',
    fields: DEDICATION_FIELDS,
    summary: (item) => item.names,
    sub: (item) => [item.lead, item.note].filter(Boolean).join(' · '),
  },
  ticker: {
    // Named for both boards it feeds, now that the חג board has a ticker of its own and the
    // two sit one tap apart in the admin.
    title: 'פס תחתון · חול ושבת',
    icon: '📜',
    addLabel: 'הוסף שורה',
    emptyLabel: 'אין שורות בפס — הפס לא יוצג',
    fields: [
      { key: 'text', label: 'תוכן השורה', type: 'text', required: true, placeholder: 'נא לכבד את קדושת בית הכנסת' },
    ],
    summary: (item) => item.text,
    sub: () => '',
  },
  // ראש השנה. Two day panels rather than one list with a day column, for the reason
  // shiurim/shiurimShabbat already settled: the gabbai edits "the יום ב׳ list", not "a row
  // carrying a day flag".
  roshDay1: {
    title: 'יום א׳ דראש השנה',
    icon: '📜',
    addLabel: 'הוסף שורה ליום א׳',
    emptyLabel: 'אין שורות ליום א׳',
    fields: ROSH_ROW_FIELDS,
    summary: ROSH_ROW_SUMMARY,
    sub: (item) => item.chazan,
  },
  roshDay2: {
    title: 'יום ב׳ דראש השנה',
    icon: '📜',
    addLabel: 'הוסף שורה ליום ב׳',
    emptyLabel: 'אין שורות ליום ב׳',
    fields: ROSH_ROW_FIELDS,
    summary: ROSH_ROW_SUMMARY,
    sub: (item) => item.chazan,
  },
  roshMechirot: {
    title: 'מכירת מצוות',
    icon: '🔨',
    addLabel: 'הוסף מצווה',
    emptyLabel: 'אין מצוות למכירה',
    fields: [
      { key: 'label', label: 'שם המצווה', type: 'text', required: true, placeholder: 'עלייה · שלישי' },
      {
        key: 'day',
        label: 'יום',
        type: 'select',
        required: false,
        options: [
          { value: 'day1', label: 'יום א׳ דראש השנה' },
          { value: 'day2', label: 'יום ב׳ דראש השנה' },
        ],
      },
      {
        key: 'kind',
        label: 'סוג המכירה',
        type: 'select',
        required: false,
        options: [
          { value: 'auction', label: 'מכירה פומבית' },
          { value: 'general', label: 'מכירה כללית · פנו לגבאי' },
        ],
      },
    ],
    summary: (item) => item.label,
    // The order within a day is the running order the board numbers — so the list screen's
    // ▲▼ buttons are how the גבאי sets it, and the summary says which day each row is in.
    sub: (item) => (item.day === 'day2' ? 'יום ב׳' : 'יום א׳'),
  },
  roshDedication: {
    title: 'הקדשת לוח החג',
    icon: '🕍',
    addLabel: 'הוסף הקדשה',
    // A list, and the board rotates through it — more than one dedication needs no code.
    emptyLabel: 'אין הקדשה — הלוח יזמין לפנות לגבאי',
    fields: DEDICATION_FIELDS,
    summary: (item) => item.names,
    sub: (item) => [item.lead, item.note].filter(Boolean).join(' · '),
  },
  roshTicker: {
    title: 'פס תחתון · ראש השנה',
    icon: '📜',
    addLabel: 'הוסף שורה',
    emptyLabel: 'אין שורות בפס — הפס לא יוצג',
    fields: [
      { key: 'text', label: 'תוכן השורה', type: 'text', required: true, placeholder: 'שנה טובה ומבורכת לכל בית ישראל' },
    ],
    summary: (item) => item.text,
    sub: () => '',
  },
};

export const PANEL_KEYS = Object.keys(PANEL_META);
