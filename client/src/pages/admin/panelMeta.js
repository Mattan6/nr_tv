// Presentation for the four panels. Mirrors the field keys in
// server/src/store/panels.js; the server owns validation, this owns the Hebrew.
// The duplication is deliberate — deriving one from the other would couple
// validation to UI copy. Adding a field means editing both.
export const PANEL_META = {
  announcements: {
    title: 'הודעות',
    icon: '📢',
    addLabel: 'הוסף הודעה',
    emptyLabel: 'אין הודעות',
    fields: [{ key: 'text', label: 'תוכן ההודעה', type: 'textarea', required: true }],
    summary: (item) => item.text,
    sub: () => '',
  },
  shiurim: {
    title: 'שיעורי תורה',
    icon: '📖',
    addLabel: 'הוסף שיעור',
    emptyLabel: 'אין שיעורים',
    fields: [
      { key: 'name', label: 'שם השיעור', type: 'text', required: true },
      { key: 'time', label: 'שעה', type: 'time', required: true },
      { key: 'by', label: 'מגיד השיעור', type: 'text', required: true },
    ],
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
};

export const PANEL_KEYS = Object.keys(PANEL_META);
