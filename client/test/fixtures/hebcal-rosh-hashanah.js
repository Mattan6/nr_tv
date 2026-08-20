// GENERATED FILE -- captured from Hebcal, not typed.
//
// Regenerate with (PowerShell, one line):
//   Invoke-RestMethod "https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&c=on&i=on&M=on&b=20&geo=pos&latitude=31.7167&longitude=34.6333&tzid=Asia/Jerusalem&start=2026-09-08&end=2026-09-22"
//
// Trimmed to the fields `holidayAnchors` reads -- title / date / hdate / category / subcat /
// yomtov -- plus `hebrew` for readability. The `leyning`, `link`, `title_orig` and `memo`
// fields Hebcal also returns are dropped; nothing in this app looks at them.
//
// Note the request carries no `lg=he`. Every other Hebcal call in this codebase asks for
// Hebrew, and this one deliberately does not: nothing in the response is ever displayed, and
// `lg=he` rewrites `title` into pointed Hebrew ('רֹאשׁ הַשָּׁנָה 5787'), turning the one field
// the matcher keys on into display copy.
//
// Why this window is the right test case, and not merely a convenient one:
//
//   * 'Erev Rosh Hashana' is ALSO category 'holiday' with subcat 'major', and it lands a day
//     EARLIER than the חג. A matcher keyed on category and title alone takes it as day one and
//     slides the whole board back twenty-four hours. Only the real חג days carry yomtov:true.
//   * Hebcal names the two days differently -- 'Rosh Hashana 5787' and 'Rosh Hashana II' --
//     which is why the title test is startsWith rather than equality.
//   * The Shabbat of 18-19 Sep carries its own candles and havdalah, three items further down
//     the same array. An anchor picked by position instead of by date takes the wrong night.
//   * Yom Kippur is in range, so the same fixture exercises a ONE-day חג through the same
//     function -- which is the whole claim that this generalises to the boards after this one.
//
// The times are real for Nitzan and match the board's mockup exactly: 18:32 / 19:28 / 19:27.
export const HEBCAL_ROSH_5787 = {
  items: [
    { title: 'Erev Rosh Hashana', date: '2026-09-11', hdate: '29 Elul 5786', category: 'holiday', subcat: 'major', hebrew: 'ערב ראש השנה' },
    { title: 'Candle lighting: 18:32', date: '2026-09-11T18:32:00+03:00', category: 'candles', hebrew: 'הדלקת נרות' },
    { title: 'Rosh Hashana 5787', date: '2026-09-12', hdate: '1 Tishrei 5787', category: 'holiday', subcat: 'major', yomtov: true, hebrew: 'ראש השנה 5787' },
    { title: 'Candle lighting: 19:28', date: '2026-09-12T19:28:00+03:00', category: 'candles', hebrew: 'הדלקת נרות' },
    { title: 'Rosh Hashana II', date: '2026-09-13', hdate: '2 Tishrei 5787', category: 'holiday', subcat: 'major', yomtov: true, hebrew: 'ראש השנה ב׳' },
    { title: 'Havdalah: 19:27', date: '2026-09-13T19:27:00+03:00', category: 'havdalah', hebrew: 'הבדלה' },
    { title: 'Candle lighting: 18:23', date: '2026-09-18T18:23:00+03:00', category: 'candles', hebrew: 'הדלקת נרות' },
    { title: 'Havdalah: 19:18', date: '2026-09-19T19:18:00+03:00', category: 'havdalah', hebrew: 'הבדלה' },
    { title: 'Erev Yom Kippur', date: '2026-09-20', hdate: '9 Tishrei 5787', category: 'holiday', subcat: 'major', hebrew: 'ערב יום כיפור' },
    { title: 'Candle lighting: 18:21', date: '2026-09-20T18:21:00+03:00', category: 'candles', hebrew: 'הדלקת נרות' },
    { title: 'Yom Kippur', date: '2026-09-21', hdate: '10 Tishrei 5787', category: 'holiday', subcat: 'major', yomtov: true, hebrew: 'יום כיפור' },
    { title: 'Havdalah: 19:16', date: '2026-09-21T19:16:00+03:00', category: 'havdalah', hebrew: 'הבדלה' },
  ],
};
