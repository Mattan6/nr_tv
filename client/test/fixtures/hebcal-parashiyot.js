// Captured Hebcal parashat names -- the fixture I1 needs to pin PARASHA_HIGHLIGHTS's 61 keys
// to the vocabulary Hebcal actually emits, not just to the table's own vocabulary.
//
// What this is: the `hebrew` field of every `category: 'parashat'` item Hebcal's own
// /hebcal endpoint returned for two civil years, verbatim -- nothing below was typed by hand.
// 2024 is a year in which six of the seven combined pairs (all but Matot/Masei, which no
// year in a nine-year sample ever splits) are read separately; 2026 is a year in which all
// seven combine. Between the two, every one of the 54 parashiyot and all seven combined
// pairs appears at least once, in whichever spelling Hebcal actually sends -- plene or ktiv
// chaser.
//
// Captured 2026-08-17 with two requests, one per year:
//
//   https://www.hebcal.com/hebcal?cfg=json&year=2024&month=x&s=on&lg=h
//   https://www.hebcal.com/hebcal?cfg=json&year=2026&month=x&s=on&lg=h
//
// -- each response's `items` array filtered to `category === 'parashat'`, keeping only the
// `hebrew` field of each, in response order (a Shabbat spanning New Year's Day repeats once
// at each end of the array -- kept as captured rather than deduplicated by hand).
//
// To recapture: rerun both requests for a pair of civil years where one has the combined
// pairs split and the other has them joined (an easy check: count the items -- a year in the
// high 40s is combined-heavy, a year near 50 is split-heavy), and replace the two arrays
// below with the new `hebrew` fields.
export const HEBCAL_PARASHIYOT = {
  2024: [
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
    "פרשת חוקת־בלק",
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
};
