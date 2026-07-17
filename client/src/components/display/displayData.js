// Static, editable content for the synagogue display dashboard.
// (Prayer schedule, shiurim, announcements, mazal tov, azkarot, parnas, ticker.)
// The zmanim panel is wired to live Hebcal data — see ZMANIM_ROWS below.

export const WEEKDAY_PRAYERS = [
  { name: 'שחרית · הנץ', time: '05:45' },
  { name: "שחרית א'", time: '06:15' },
  { name: "שחרית ב'", time: '07:00' },
  { name: 'מנחה גדולה', time: '13:00' },
  { name: 'מנחה', time: '18:35' },
  { name: "ערבית א'", time: '19:20' },
  { name: "ערבית ב'", time: '20:45' },
];

export const SHABBAT_PRAYERS = [
  { name: 'הדלקת נרות', time: '18:21' },
  { name: 'מנחה וקבלת שבת', time: '18:26' },
  { name: 'שחרית', time: '07:45' },
  { name: 'סוף זמן ק״ש', time: '09:10' },
  { name: 'מנחה גדולה', time: '13:00' },
  { name: 'שיעור בפרשה', time: '17:00' },
  { name: 'מנחה', time: '17:30' },
  { name: 'ערבית מוצ״ש', time: '19:16' },
];

// Maps each displayed zman to its Hebcal `times` field. Times come live from
// Hebcal for Nitzan (see services/hebcal.js LOCATION).
export const ZMANIM_ROWS = [
  { name: 'עלות השחר', field: 'alotHaShachar' },
  { name: 'הנץ החמה', field: 'sunrise' },
  { name: 'סוזק״ש מג״א', field: 'sofZmanShmaMGA' },
  { name: 'סוזק״ש גר״א', field: 'sofZmanShma' },
  { name: 'סו״ז תפילה', field: 'sofZmanTfilla' },
  { name: 'חצות היום', field: 'chatzot' },
  { name: 'מנחה גדולה', field: 'minchaGedola' },
  { name: 'שקיעת החמה', field: 'sunset' },
  { name: 'צאת הכוכבים', field: 'tzeit85deg' },
  { name: 'צאת ר״ת', field: 'tzeit72min' },
];

export const SHIURIM = [
  { name: 'דף היומי', time: '06:45', by: 'הרב יגאל' },
  { name: 'הלכה יומית', time: '13:15', by: 'הרב מוטה' },
  { name: 'עין יעקב', time: '17:30', by: 'הרב שלום' },
  { name: 'שיעור לנשים', time: '16:45', by: 'הרב ורהפטיג' },
  { name: 'שיעור הלכה', time: '20:00', by: 'הרב יגאל' },
];

export const ANNOUNCEMENTS = [
  'שיעורו של הרב מוטה יתקיים הערב\nבשעה 20:00 בבית המדרש',
  'יישר כח למשפחת פרידמן\nעל תרומת המעקה לבימת הכהנים',
  'ניתן להירשם לשיעור הדף היומי\nאצל הגבאי · 054-848-7595',
];

export const MAZAL = [
  { names: 'משפחת בן חמו', occasion: 'להולדת הבן — מזל טוב!' },
  { names: 'משפחת אזולאי', occasion: 'לרגל האירוסין — בשעה טובה' },
  { names: 'ר׳ יוסי נעים הי״ו', occasion: 'לרגל יום ההולדת' },
];

export const AZKAROT = [
  { name: 'משה בן פרטונה ז״ל', detail: 'נתרם ע״י יעל ורמון בראון', date: 'י״ח באלול' },
  { name: 'חנה נינט ריין בת פרטונה ז״ל', detail: 'תנצב״ה', date: "ה' בתמוז" },
  { name: 'רוברט ישראל בן רוזי ז״ל', detail: 'לעילוי נשמת', date: 'כ״ג בטבת' },
];

export const PARNAS = {
  name: 'הרב יחזקאל ישעי שליט״א',
  detail: 'נדבת ידידנו הנכבד\nרודף צדקה וחסד',
};

export const TICKER =
  'בית כנסת נווה רחמים  •  נא לכבד את קדושת בית הכנסת ולכבות את הטלפונים  •  נדבת משפחת בן חמו לעילוי נשמת משה בן פרטונה  •  לתרומות והנצחות פנו לגבאי · 054-848-7595  •  ';

// Finds the next prayer after `now` from `list` and returns its name, time,
// and an HH:MM:SS countdown. If none remain today, rolls to the first tomorrow.
export function computeNextMinyan(now, list) {
  if (!list.length) return { name: '', time: '', countdown: '--:--:--' };
  const mins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  let target = null;
  for (const it of list) {
    const [h, m] = it.time.split(':').map(Number);
    if (h * 60 + m > mins) {
      target = it;
      break;
    }
  }
  const base = new Date(now);
  if (target) {
    const [h, m] = target.time.split(':').map(Number);
    base.setHours(h, m, 0, 0);
  } else {
    target = list[0];
    const [h, m] = target.time.split(':').map(Number);
    base.setDate(base.getDate() + 1);
    base.setHours(h, m, 0, 0);
  }
  const diff = Math.max(0, Math.floor((base - now) / 1000));
  const pad = (n) => String(n).padStart(2, '0');
  const countdown = `${pad(Math.floor(diff / 3600))}:${pad(Math.floor((diff % 3600) / 60))}:${pad(diff % 60)}`;
  return { name: target.name, time: target.time, countdown };
}
