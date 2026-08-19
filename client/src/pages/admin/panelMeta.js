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
    fields: [
      { key: 'lead', label: 'נוסח ההקדשה', type: 'text', required: true, placeholder: 'מוקדש להצלחת' },
      { key: 'names', label: 'שם המוקדש', type: 'text', required: true, placeholder: 'משפחת מזוז' },
      { key: 'note', label: 'סיומת', type: 'text', required: false, placeholder: 'בכל העניינים' },
    ],
    summary: (item) => item.names,
    sub: (item) => [item.lead, item.note].filter(Boolean).join(' · '),
  },
  ticker: {
    title: 'פס תחתון',
    icon: '📜',
    addLabel: 'הוסף שורה',
    emptyLabel: 'אין שורות בפס — הפס לא יוצג',
    fields: [
      { key: 'text', label: 'תוכן השורה', type: 'text', required: true, placeholder: 'נא לכבד את קדושת בית הכנסת' },
    ],
    summary: (item) => item.text,
    sub: () => '',
  },
};

export const PANEL_KEYS = Object.keys(PANEL_META);
