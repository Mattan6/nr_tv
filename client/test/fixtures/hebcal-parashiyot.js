// GENERATED FILE -- captured from Hebcal, not typed. Regenerate with the script described below.
//
// What this is: the `hebrew` field of every `category: 'parashat'` item Hebcal returned for
// four civil years, verbatim. It exists to pin PARASHA_HIGHLIGHTS's keys to the vocabulary
// Hebcal actually emits rather than to the table's own vocabulary -- the seam that has broken
// twice, once on multi-word names meeting a maqaf and once on nine plene/chaser spellings.
//
// **Captured with `i=on`, the Israel schedule**, because that is what the display receives:
// hebcal.com/shabbat infers Israel from the shul's coordinates, so in a year where the two
// schedules diverge (2026 has five such weeks) the board reads Israel's parasha. A fixture
// captured on the diaspora schedule would pin a vocabulary this app never sees.
//
// Why these three years, and no others: they are the smallest set covering every key Hebcal
// can emit, and each one is load-bearing. 2026 is a year in which all seven pairs combine;
// 2025 splits נצבים and וילך; 2035 splits מטות and מסעי -- the nearest such year, there is
// none between 2024 and 2034. Drop any one and the coverage test names exactly what became
// unreachable: without 2025 it is נצבים and וילך, without 2035 מטות and מסעי, without 2026
// ויקהל־פקודי. A fourth year (2024) was captured first and removed once measurement showed
// it added nothing the other three did not already cover.
//
// Two of the table's 61 keys are deliberately NOT covered, because Hebcal never emits them
// for Israel and no fixture can contain them:
//
//   וזאת־הברכה   read on Simchat Torah, never on a Shabbat, so it is never a parashat item
//                (checked 2024-2050: zero occurrences on either schedule).
//   חוקת־בלק     a diaspora-only combination (חו"ל 2026, 2027, 2030, 2033, 2040). In Israel
//                חוקת and בלק are always read apart, so this shul never looks it up.
//
// The test names both exceptions explicitly rather than asserting a round 61, so the gap is
// a stated boundary rather than a silent shortfall.
//
// Captured 2026-08-17 with one request per year:
//
//   https://www.hebcal.com/hebcal?cfg=json&year=<year>&month=x&s=on&lg=h&i=on
//
// A Shabbat spanning New Year's Day appears at both ends of a year's array; kept as captured.

export const HEBCAL_PARASHIYOT = {
  2025: [
    "פרשת ויגש",
    "פרשת ויחי",
    "פרשת שמות",
    "פרשת וארא",
    "פרשת בא",
    "פרשת בשלח",
    "פרשת יתרו",
    "פרשת משפטים",
    "פרשת תרומה",
    "פרשת תצוה",
    "פרשת כי תשא",
    "פרשת ויקהל",
    "פרשת פקודי",
    "פרשת ויקרא",
    "פרשת צו",
    "פרשת שמיני",
    "פרשת תזריע־מצרע",
    "פרשת אחרי מות־קדשים",
    "פרשת אמור",
    "פרשת בהר־בחקתי",
    "פרשת במדבר",
    "פרשת נשא",
    "פרשת בהעלתך",
    "פרשת שלח־לך",
    "פרשת קורח",
    "פרשת חוקת",
    "פרשת בלק",
    "פרשת פינחס",
    "פרשת מטות־מסעי",
    "פרשת דברים",
    "פרשת ואתחנן",
    "פרשת עקב",
    "פרשת ראה",
    "פרשת שופטים",
    "פרשת כי־תצא",
    "פרשת כי־תבוא",
    "פרשת נצבים",
    "פרשת וילך",
    "פרשת האזינו",
    "פרשת בראשית",
    "פרשת נח",
    "פרשת לך־לך",
    "פרשת וירא",
    "פרשת חיי שרה",
    "פרשת תולדות",
    "פרשת ויצא",
    "פרשת וישלח",
    "פרשת וישב",
    "פרשת מקץ",
    "פרשת ויגש",
  ],
  2026: [
    "פרשת ויחי",
    "פרשת שמות",
    "פרשת וארא",
    "פרשת בא",
    "פרשת בשלח",
    "פרשת יתרו",
    "פרשת משפטים",
    "פרשת תרומה",
    "פרשת תצוה",
    "פרשת כי תשא",
    "פרשת ויקהל־פקודי",
    "פרשת ויקרא",
    "פרשת צו",
    "פרשת שמיני",
    "פרשת תזריע־מצרע",
    "פרשת אחרי מות־קדשים",
    "פרשת אמור",
    "פרשת בהר־בחקתי",
    "פרשת במדבר",
    "פרשת נשא",
    "פרשת בהעלתך",
    "פרשת שלח־לך",
    "פרשת קורח",
    "פרשת חוקת",
    "פרשת בלק",
    "פרשת פינחס",
    "פרשת מטות־מסעי",
    "פרשת דברים",
    "פרשת ואתחנן",
    "פרשת עקב",
    "פרשת ראה",
    "פרשת שופטים",
    "פרשת כי־תצא",
    "פרשת כי־תבוא",
    "פרשת נצבים־וילך",
    "פרשת האזינו",
    "פרשת בראשית",
    "פרשת נח",
    "פרשת לך־לך",
    "פרשת וירא",
    "פרשת חיי שרה",
    "פרשת תולדות",
    "פרשת ויצא",
    "פרשת וישלח",
    "פרשת וישב",
    "פרשת מקץ",
    "פרשת ויגש",
    "פרשת ויחי",
  ],
  2035: [
    "פרשת וארא",
    "פרשת בא",
    "פרשת בשלח",
    "פרשת יתרו",
    "פרשת משפטים",
    "פרשת תרומה",
    "פרשת תצוה",
    "פרשת כי תשא",
    "פרשת ויקהל",
    "פרשת פקודי",
    "פרשת ויקרא",
    "פרשת צו",
    "פרשת שמיני",
    "פרשת תזריע",
    "פרשת מצרע",
    "פרשת אחרי מות",
    "פרשת קדשים",
    "פרשת אמור",
    "פרשת בהר",
    "פרשת בחקתי",
    "פרשת במדבר",
    "פרשת נשא",
    "פרשת בהעלתך",
    "פרשת שלח־לך",
    "פרשת קורח",
    "פרשת חוקת",
    "פרשת בלק",
    "פרשת פינחס",
    "פרשת מטות",
    "פרשת מסעי",
    "פרשת דברים",
    "פרשת ואתחנן",
    "פרשת עקב",
    "פרשת ראה",
    "פרשת שופטים",
    "פרשת כי־תצא",
    "פרשת כי־תבוא",
    "פרשת נצבים־וילך",
    "פרשת האזינו",
    "פרשת בראשית",
    "פרשת נח",
    "פרשת לך־לך",
    "פרשת וירא",
    "פרשת חיי שרה",
    "פרשת תולדות",
    "פרשת ויצא",
    "פרשת וישלח",
    "פרשת וישב",
    "פרשת מקץ",
  ],
};

export const HEBCAL_YEARS = [2025, 2026, 2035];

// Keys Hebcal cannot emit for Israel -- see the note above. Exported so the test states its
// own boundary instead of hiding it behind a smaller number.
export const NOT_EMITTED_BY_HEBCAL = ['וזאת־הברכה', 'חוקת־בלק'];
