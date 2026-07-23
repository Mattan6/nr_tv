// Seed written to server/data/content.json on first boot. Until the admin panel
// existed these arrays lived in client/src/components/display/displayData.js; this
// module is now their only copy.
//
// Seed ids are fixed readable strings so the file stays diff-able and tests stay
// deterministic. Items created through the API get a crypto.randomUUID() instead.
module.exports = {
  version: 1,
  updatedAt: null,
  announcements: [
    { id: 'seed-ann-1', text: 'שיעורו של הרב מוטה יתקיים הערב\nבשעה 20:00 בבית המדרש', isActive: true },
    { id: 'seed-ann-2', text: 'יישר כח למשפחת פרידמן\nעל תרומת המעקה לבימת הכהנים', isActive: true },
    { id: 'seed-ann-3', text: 'ניתן להירשם לשיעור הדף היומי\nאצל הגבאי · 054-848-7595', isActive: true },
  ],
  shiurim: [
    { id: 'seed-shi-1', name: 'דף היומי', time: '06:45', by: 'הרב יגאל', isActive: true },
    { id: 'seed-shi-2', name: 'הלכה יומית', time: '13:15', by: 'הרב מוטה', isActive: true },
    { id: 'seed-shi-3', name: 'עין יעקב', time: '17:30', by: 'הרב שלום', isActive: true },
    { id: 'seed-shi-4', name: 'שיעור לנשים', time: '16:45', by: 'הרב ורהפטיג', isActive: true },
    { id: 'seed-shi-5', name: 'שיעור הלכה', time: '20:00', by: 'הרב יגאל', isActive: true },
  ],
  mazal: [
    { id: 'seed-maz-1', names: 'משפחת בן חמו', occasion: 'להולדת הבן — מזל טוב!', isActive: true },
    { id: 'seed-maz-2', names: 'משפחת אזולאי', occasion: 'לרגל האירוסין — בשעה טובה', isActive: true },
    { id: 'seed-maz-3', names: 'ר׳ יוסי נעים הי״ו', occasion: 'לרגל יום ההולדת', isActive: true },
  ],
  azkarot: [
    { id: 'seed-azk-1', name: 'משה בן פרטונה ז״ל', detail: 'נתרם ע״י יעל ורמון בראון', date: 'י״ח באלול', isActive: true },
    { id: 'seed-azk-2', name: 'חנה נינט ריין בת פרטונה ז״ל', detail: 'תנצב״ה', date: "ה' בתמוז", isActive: true },
    { id: 'seed-azk-3', name: 'רוברט ישראל בן רוזי ז״ל', detail: 'לעילוי נשמת', date: 'כ״ג בטבת', isActive: true },
  ],
};
