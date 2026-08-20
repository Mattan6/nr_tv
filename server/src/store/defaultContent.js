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
  // שיעורי שבת, and deliberately empty — for a fresh install as much as for an upgrade.
  // Seeding it would put invented שיעורים on a real shul's שבת board the first time it
  // booted, and backfilling an upgrade from that seed would do the same to a shul whose
  // real list is the חול one above. Empty is the only value that is honest in both cases;
  // the gabbai fills it from /adminGabbai. Until he does, the שבת board's card says so.
  shiurimShabbat: [],
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
  // הקדשת הלוח, and empty for the same reason shiurimShabbat above is — there is no honest
  // value to invent. A dedication names a real family, so seeding one would put a stranger's
  // name on a real shul's board the first time it booted, and backfilling an upgrade from
  // that seed would do it to a shul that has been running for a year. Until the gabbai adds
  // one, the card shows its own invitation to dedicate instead.
  dedication: [],
  // The bottom ticker, one item per line. These four are the string that lived in
  // client/src/components/display/displayData.js as TICKER, split on its • separators, so
  // a server that upgrades into this feature shows exactly what it showed before.
  ticker: [
    { id: 'seed-tic-1', text: 'בית כנסת נווה רחמים', isActive: true },
    { id: 'seed-tic-2', text: 'נא לכבד את קדושת בית הכנסת ולכבות את הטלפונים', isActive: true },
    { id: 'seed-tic-3', text: 'נדבת משפחת בן חמו לעילוי נשמת משה בן פרטונה', isActive: true },
    { id: 'seed-tic-4', text: 'לתרומות והנצחות פנו לגבאי · 054-848-7595', isActive: true },
  ],
  // ראש השנה, on /tv?screen=rosh.
  //
  // Seeded with real content rather than left empty, which is the opposite of what
  // shiurimShabbat and dedication above do — and the difference is where the content came
  // from, not how new the panel is. Those two are empty because there is no honest value to
  // INVENT: a seeded dedication is a stranger's family name on a real shul's wall. Every row
  // below was written and corrected by the gabbai himself in the board's mockup, so it is this
  // shul's own schedule rather than sample text. All of it is editable in /adminGabbai.
  //
  // `time` is blank on the rows the shul posts no minute for — they follow the row above, and
  // the board renders them with an empty time rather than a '--:--' that would read as a
  // missing one.
  //
  // `kind` drives the row's colour AND, for shofar and tashlich, the highlight card derived
  // from it. See ROW_KINDS in store/panels.js.
  roshDay1: [
    { id: 'seed-r1-1', name: 'מנחה ערב חג', time: '18:35', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r1-2', name: 'דבר תורה', time: '18:50', chazan: 'יצחק כהן שליט״א', kind: 'shiur', isActive: true },
    { id: 'seed-r1-3', name: 'מכירת מצוות', time: '19:00', chazan: 'הגבאי ר׳ ברוך מזוז', kind: 'mechirot', isActive: true },
    { id: 'seed-r1-4', name: 'ערבית ליל החג', time: '', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r1-5', name: 'שיעור', time: '06:45', chazan: 'ר׳ אפרים עבדיאן שליט״א', kind: 'shiur', isActive: true },
    { id: 'seed-r1-6', name: 'שחרית', time: '07:30', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r1-7', name: 'עת שערי רצון', time: '', chazan: '', kind: 'piyut', isActive: true },
    { id: 'seed-r1-8', name: 'מוסף', time: '', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r1-9', name: 'שיעור', time: '15:20', chazan: 'ר׳ אפרים עבדיאן שליט״א', kind: 'shiur', isActive: true },
    { id: 'seed-r1-10', name: 'מנחה', time: '16:20', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r1-11', name: 'תשליך', time: '17:00', chazan: 'בבית משפחת רחמין', kind: 'tashlich', isActive: true },
  ],
  roshDay2: [
    { id: 'seed-r2-1', name: 'מכירת מצוות', time: '19:15', chazan: 'הגבאי ר׳ ברוך מזוז', kind: 'mechirot', isActive: true },
    { id: 'seed-r2-2', name: 'ערבית ליל החג', time: '', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r2-3', name: 'שיעור', time: '06:20', chazan: 'ר׳ אפרים עבדיאן שליט״א', kind: 'shiur', isActive: true },
    { id: 'seed-r2-4', name: 'שחרית', time: '07:00', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r2-5', name: 'עת שערי רצון', time: '', chazan: '', kind: 'piyut', isActive: true },
    { id: 'seed-r2-6', name: 'תקיעת שופר', time: '09:45', chazan: 'הבעל תוקע ישובץ בהמשך', kind: 'shofar', isActive: true },
    { id: 'seed-r2-7', name: 'מוסף', time: '', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r2-8', name: 'שיעור', time: '17:20', chazan: 'ר׳ אפרים עבדיאן שליט״א', kind: 'shiur', isActive: true },
    { id: 'seed-r2-9', name: 'מנחה', time: '18:30', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r2-10', name: 'ערבית מוצאי חג', time: '19:07', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
  ],
  // Ten on the first day and eight on the second, which the board pages four to a screen —
  // 4 + 4 + 2 then 4 + 4. The numbers beside each row are positions in the day's running
  // order, derived at render, so inserting a מצווה renumbers the rest for free.
  roshMechirot: [
    { id: 'seed-rm-1', label: 'ברכת השנה', day: 'day1', kind: 'general', isActive: true },
    { id: 'seed-rm-2', label: 'פרנסה', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-3', label: 'פתיחת היכל', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-4', label: 'הולכה והגבהה', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-5', label: 'עלייה · שלישי', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-6', label: 'עלייה · רביעי', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-7', label: 'עלייה · חמישי', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-8', label: 'עלייה · שישי', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-9', label: 'עלייה · שביעי', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-10', label: 'עלייה · מפטיר', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-11', label: 'ברכת השנה', day: 'day2', kind: 'general', isActive: true },
    { id: 'seed-rm-12', label: 'פרנסה', day: 'day2', kind: 'auction', isActive: true },
    { id: 'seed-rm-13', label: 'פתיחת היכל', day: 'day2', kind: 'auction', isActive: true },
    { id: 'seed-rm-14', label: 'הולכה והגבהה', day: 'day2', kind: 'auction', isActive: true },
    { id: 'seed-rm-15', label: 'עלייה · שלישי', day: 'day2', kind: 'auction', isActive: true },
    { id: 'seed-rm-16', label: 'עלייה · רביעי', day: 'day2', kind: 'auction', isActive: true },
    { id: 'seed-rm-17', label: 'עלייה · חמישי', day: 'day2', kind: 'auction', isActive: true },
    { id: 'seed-rm-18', label: 'עלייה · מפטיר', day: 'day2', kind: 'auction', isActive: true },
  ],
  // A list, and the board rotates through it — a second and third dedication need no code.
  // The niqqud is the board's own typography; the gabbai may type with it or without.
  roshDedication: [
    { id: 'seed-rd-1', lead: 'מֻקְדָּשׁ לְהַצְלָחַת', names: 'מִשְׁפַּחַת מַזּוּז', note: 'בְּכָל הָעִנְיָנִים', isActive: true },
  ],
  // The חג's own ticker, one item per line — the mockup's marquee split on its • separators.
  // The חול and שבת boards keep sharing `ticker` above.
  roshTicker: [
    { id: 'seed-rt-1', text: 'שנה טובה ומבורכת לכל בית ישראל', isActive: true },
    { id: 'seed-rt-2', text: 'כתיבה וחתימה טובה לכל קהל בית הכנסת ובני משפחותיהם', isActive: true },
    { id: 'seed-rt-3', text: 'בליל יום שני מדליקים נרות מאש קיימת בלבד ומברכים שהחיינו על פרי חדש', isActive: true },
    { id: 'seed-rt-4', text: 'לוח ראש השנה מוקדש להצלחת משפחת מזוז בכל העניינים', isActive: true },
    { id: 'seed-rt-5', text: 'רוצים להקדיש את הלוחות הבאים? חג או שבת — פנו לגבאי', isActive: true },
  ],
  // Fixed times set by the gabbai, one group per board. '' means "compute it from the
  // zmanim", which is the default for every row in both groups — see resolveShabbatTimes and
  // resolveRoshTimes in the client.
  settings: {
    shabbat: { candles: '', kabbalat: '', shacharit: '', mincha: '', arvit: '' },
    // A live Hebcal request for Nitzan returns exactly the 18:32 / 19:28 / 19:27 the mockup
    // shows for תשפ״ז, so seeding those three would buy nothing and would pin this year's
    // numbers onto every year after it.
    rosh: { candles1: '', candles2: '', havdalah: '' },
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
