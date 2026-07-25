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
  // The bottom ticker, one item per line. These four are the string that lived in
  // client/src/components/display/displayData.js as TICKER, split on its • separators, so
  // a server that upgrades into this feature shows exactly what it showed before.
  ticker: [
    { id: 'seed-tic-1', text: 'בית כנסת נווה רחמים', isActive: true },
    { id: 'seed-tic-2', text: 'נא לכבד את קדושת בית הכנסת ולכבות את הטלפונים', isActive: true },
    { id: 'seed-tic-3', text: 'נדבת משפחת בן חמו לעילוי נשמת משה בן פרטונה', isActive: true },
    { id: 'seed-tic-4', text: 'לתרומות והנצחות פנו לגבאי · 054-848-7595', isActive: true },
  ],
  // Fixed שבת times set by the gabbai. '' means "compute it from the zmanim", which is
  // the default for all five — see resolveShabbatTimes in the client.
  settings: {
    shabbat: { candles: '', kabbalat: '', shacharit: '', mincha: '', arvit: '' },
  },
  // בדיחות ליאור. Scraped jokes are appended to this list at runtime
  // (server/src/jokes/refresh.js); these thirty are what the wall shows before the first
  // scrape, and what remains if yo-yoo is never reachable. Every one of them passes
  // server/src/jokes/filter.js — asserted in server/test/jokesSeed.test.js, because a seed
  // its own filter rejects would be a contradiction on the wall.
  jokes: [
    { id: 'seed-jok-1', text: 'מה אמר הקיר לקיר השני? ניפגש בפינה.', isActive: true },
    { id: 'seed-jok-2', text: 'איך קוראים לדג בלי עין? דג.', isActive: true },
    { id: 'seed-jok-3', text: 'למה השלד לא הלך למסיבה? כי לא היה לו עם מי.', isActive: true },
    { id: 'seed-jok-4', text: 'מה אמר המזלג לסכין? אתה חד מדי בשבילי.', isActive: true },
    { id: 'seed-jok-5', text: 'למה המחשב הלך לרופא? כי הוא תפס וירוס.', isActive: true },
    { id: 'seed-jok-6', text: 'מה אמר הכובע לצעיף? אתה תישאר כאן, אני הולך על הראש.', isActive: true },
    { id: 'seed-jok-7', text: 'למה הספר הלך לבית החולים? כי כאבה לו הכריכה.', isActive: true },
    { id: 'seed-jok-8', text: 'מה אמר הקיר לתמונה? שוב אתה תלוי עליי.', isActive: true },
    { id: 'seed-jok-9', text: 'למה העגבנייה הסמיקה? כי היא ראתה את הרוטב.', isActive: true },
    { id: 'seed-jok-10', text: 'איך קוראים לדוב בלי אוזניים? דב.', isActive: true },
    { id: 'seed-jok-11', text: 'מה אמרה הנעל לגרב? בלעדיך אני מרגישה ריקה.', isActive: true },
    { id: 'seed-jok-12', text: 'למה הדלת התעצבנה? כי כל היום דופקים לה על הראש.', isActive: true },
    { id: 'seed-jok-13', text: 'מה אומר הקומקום כשהוא כועס? אני רותח מבפנים.', isActive: true },
    { id: 'seed-jok-14', text: 'למה המנורה הלכה לישון? כי נגמר לה האור.', isActive: true },
    { id: 'seed-jok-15', text: 'מה אמרה הביצה למחבת? אתה מחמם לי את הראש.', isActive: true },
    { id: 'seed-jok-16', text: 'למה המקרר לא צוחק אף פעם? כי יש לו לב קר.', isActive: true },
    { id: 'seed-jok-17', text: 'מה אמר הגשם למטרייה? בלעדייך הייתי נוגע בכולם.', isActive: true },
    { id: 'seed-jok-18', text: 'איך יוצאים ממעגל? אי אפשר, אין לו פינות.', isActive: true },
    { id: 'seed-jok-19', text: 'מה אמר העיפרון למחק? אתה מוחק לי את כל החיים.', isActive: true },
    { id: 'seed-jok-20', text: 'מה אמרה השעה לדקה? אל תמהרי, יש לנו זמן.', isActive: true },
    { id: 'seed-jok-21', text: 'למה הכיסא עייף? כי כל היום יושבים עליו.', isActive: true },
    { id: 'seed-jok-22', text: 'מה אמר הים לחול? אל תדאג, אני תמיד חוזר אליך.', isActive: true },
    { id: 'seed-jok-23', text: 'למה הנר עצוב? כי הוא נמס מרוב אהבה.', isActive: true },
    { id: 'seed-jok-24', text: 'מה אמרה המחברת לעט? תכתוב עליי משהו יפה.', isActive: true },
    { id: 'seed-jok-25', text: 'למה הבצל בכה? כי הוא ראה סרט עצוב.', isActive: true },
    { id: 'seed-jok-26', text: 'מה אמר הסבון למים? בלעדיכם אני לא שווה כלום.', isActive: true },
    { id: 'seed-jok-27', text: 'למה הכדור עגול? כדי שלא ייתקע בפינות.', isActive: true },
    { id: 'seed-jok-28', text: 'מה אמרה הצלחת לכף? בלעדייך הייתי נשארת מלאה.', isActive: true },
    { id: 'seed-jok-29', text: 'למה הגרביים תמיד נעלמים? כי הם הולכים בזוגות.', isActive: true },
    { id: 'seed-jok-30', text: 'מה אמר הבלון לסיכה? אל תתקרבי אליי בבקשה.', isActive: true },
  ],
};
