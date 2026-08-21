import test from 'node:test';
import assert from 'node:assert/strict';
import {
  screenSegment,
  shabbatFriday,
  upcomingSaturday,
  shabbatCardTimes,
  TZEIT_AFTER_SUNSET_MIN,
  toClock,
  SHABBAT_PRAYERS,
  WEEKDAY_PRAYERS,
  resolvePrayers,
  computeNextMinyan,
} from '../src/components/display/displayData.js';
import { EMPHASIS } from '../src/components/shabbat/prayerEmphasis.js';

// Every instant below is written with an explicit Israel offset — +03:00 in summer, +02:00 in
// winter — so the assertions describe Israel's wall clock no matter what TZ the runner has.
// That is the whole point: these functions exist because the TV's own clock cannot be trusted.
const at = (iso) => new Date(iso);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 2026-08-16 is a Sunday, so 08-21 is Friday, 08-22 Saturday, 08-23 Sunday. Israel is +03:00.
test('weekday until Friday 08:59:59 Israel time', () => {
  const { screen, key } = screenSegment(at('2026-08-21T08:59:59+03:00'));
  assert.equal(screen, 'weekday');
  assert.equal(key, 'weekday@2026-08-16');
});

test('shabbat from Friday 09:00:00 Israel time', () => {
  const { screen, key } = screenSegment(at('2026-08-21T09:00:00+03:00'));
  assert.equal(screen, 'shabbat');
  assert.equal(key, 'shabbat@2026-08-21');
});

test('still shabbat at Saturday 23:59:59 Israel time', () => {
  const { screen, key } = screenSegment(at('2026-08-22T23:59:59+03:00'));
  assert.equal(screen, 'shabbat');
  assert.equal(key, 'shabbat@2026-08-21');
});

test('weekday from Sunday 00:00:00 Israel time', () => {
  const { screen, key } = screenSegment(at('2026-08-23T00:00:00+03:00'));
  assert.equal(screen, 'weekday');
  assert.equal(key, 'weekday@2026-08-23');
});

// 2026-01-16 is a Friday; Israel is +02:00 in January. The boundary is a wall-clock hour, so
// it must not drift with the season.
test('the Friday boundary is 09:00 in winter too', () => {
  assert.equal(screenSegment(at('2026-01-16T08:59:59+02:00')).screen, 'weekday');
  assert.equal(screenSegment(at('2026-01-16T09:00:00+02:00')).screen, 'shabbat');
});

test('shabbatFriday is the Friday of the Shabbat upcomingSaturday names', () => {
  for (const iso of [
    '2026-08-16T12:00:00+03:00', // Sunday
    '2026-08-20T12:00:00+03:00', // Thursday
    '2026-08-21T09:00:00+03:00', // Friday, on the boundary
    '2026-08-22T20:00:00+03:00', // Saturday evening
  ]) {
    assert.equal(ymd(shabbatFriday(at(iso))), '2026-08-21', iso);
    assert.equal(ymd(upcomingSaturday(at(iso))), '2026-08-22', iso);
  }
});

// The case the Israel-time plumbing exists for: east of Israel the device has already rolled
// over to Sunday while Nitzan is still in Shabbat. Run the file under TZ=Pacific/Auckland and
// this must still answer with Friday the 21st.
test('shabbatFriday reads Israel\'s calendar, not the device\'s', () => {
  assert.equal(ymd(shabbatFriday(at('2026-08-22T22:00:00+03:00'))), '2026-08-21');
});

// Israel, high summer. The real numbers Hebcal returns for Nitzan on 2026-08-22: sunset
// 19:17, and havdalah at 8.5° below the horizon 38 minutes later at 19:55.
const ANCHORS = {
  fridaySunset: '2026-08-21T19:18:00+03:00',
  saturdaySunset: '2026-08-22T19:17:00+03:00',
  saturdayTzeit72: '2026-08-22T20:29:00+03:00',
  havdalah: '2026-08-22T19:55:00+03:00',
};

test('the candle card gets Friday\'s sunset, not Saturday\'s', () => {
  assert.equal(shabbatCardTimes(ANCHORS).fridaySunset, '19:18');
});

// The bug this replaced: the card posted שקיעה + TZEIT_AFTER_SUNSET_MIN — צאת הכוכבים as
// this shul reckons it for davening ערבית — under a heading reading מוצאי שבת. That is a
// different zman and it is EARLIER: 19:35 against a real end of Shabbat at 19:55, so the
// board told the congregation Shabbat was out nineteen minutes before it was.
//
// The assertion is deliberately written as a comparison rather than a literal, so that it
// fails if anyone reintroduces the sunset-plus-offset reckoning here for any reason.
test('מוצאי שבת is Hebcal\'s הבדלה, never שקיעה plus the ערבית offset', () => {
  const { havdalah } = shabbatCardTimes(ANCHORS);
  assert.equal(havdalah, '19:55');
  assert.notEqual(havdalah, toClock(ANCHORS.saturdaySunset, TZEIT_AFTER_SUNSET_MIN));
});

test('צאת ר״ת is read straight off Saturday\'s zmanim', () => {
  assert.equal(shabbatCardTimes(ANCHORS).tzeitRT, '20:29');
});

test('a missing anchor is null, never a stale or invented time', () => {
  const partial = shabbatCardTimes({ havdalah: ANCHORS.havdalah });
  assert.equal(partial.fridaySunset, null);
  assert.equal(partial.tzeitRT, null);
  assert.equal(partial.havdalah, '19:55');
  const nothing = shabbatCardTimes();
  assert.equal(nothing.fridaySunset, null);
  assert.equal(nothing.havdalah, null);
  assert.equal(nothing.tzeitRT, null);
});

// I2: ShabbatDisplay.jsx filters SHABBAT_PRAYERS on the hand-copied literal 'הדלקת נרות', and
// PrayerListCard.jsx's EMPHASIS regex hand-copies three more of its names (including the
// U+05F4 gershayim in 'מוצ״ש'). Neither literal is derived from SHABBAT_PRAYERS, so a rename
// there would silently break one or both without either side failing to compile. This pins
// today's split — two rows in ערב שבת once הדלקת נרות is pulled out, three in יום השבת — so a
// future rename of any of these six names is caught here instead of on the wall.
test('the שבת board\'s prayer split matches SHABBAT_PRAYERS', () => {
  const rows = resolvePrayers(SHABBAT_PRAYERS, null, {});
  assert.equal(rows.filter((p) => p.day === 5 && p.name !== 'הדלקת נרות').length, 2);
  assert.equal(rows.filter((p) => p.day === 6).length, 3);
});

// Friday's ערבית posts an empty time column on purpose — the row under קבלת שבת is what says
// when it is. Empty is one character away from the failure it must never be mistaken for: under
// `||` rather than `??` in resolvePrayers, `text: ''` falls straight through to '--:--', which
// on this board means a time that was supposed to arrive and didn't. Nothing about the rendered
// row would look wrong, so nothing but this test would catch it.
test('Friday ערבית posts an empty time, not --:--', () => {
  const rows = resolvePrayers(SHABBAT_PRAYERS, null, { shabKabbalat: '19:15' });
  const arvit = rows.find((p) => p.day === 5 && p.name === 'ערבית');
  assert.equal(arvit.time, '');
  assert.equal(arvit.clock, null);
});

// A row with no clock is not a candidate for המניין הבא — which is what keeps the card from
// counting down to a ערבית it cannot name a minute for. Friday evening therefore runs
// נרות → קבלת שבת and then rolls to Saturday morning, exactly as it did before the row existed.
test('Friday ערבית never becomes המניין הבא', () => {
  const rows = resolvePrayers(SHABBAT_PRAYERS, null, {
    shabCandles: '19:00',
    shabKabbalat: '19:15',
    shabShacharit: '07:45',
  });
  const nameAt = (iso) => computeNextMinyan(at(iso), rows).name;
  assert.equal(nameAt('2026-08-21T18:00:00+03:00'), 'הדלקת נרות');
  assert.equal(nameAt('2026-08-21T19:05:00+03:00'), 'מנחה וקבלת שבת');
  assert.equal(nameAt('2026-08-21T19:20:00+03:00'), 'שחרית ומוסף');
});

// The weekday ערבית is the other side of the `??`: it carries real text, and that text must
// still win over the clock it inherits from מנחה. Changing resolvePrayers for the שבת row
// above must not quietly blank this one.
test('the weekday ערבית still shows its text over the inherited clock', () => {
  const rows = resolvePrayers(WEEKDAY_PRAYERS, null, { mincha: '19:20' });
  const arvit = rows.find((p) => p.name === 'ערבית');
  assert.equal(arvit.time, 'מיד לאחר מנחה');
  assert.equal(arvit.clock, '19:20');
});

// The companion check: EMPHASIS itself still recognizes the two rows that actually reach
// PrayerListCard bolded — קבלת שבת (inside 'מנחה וקבלת שבת') and ערבית מוצ״ש — and still leaves
// the two plain rows, שחרית ומוסף and bare מנחה, unbolded.
test('EMPHASIS bolds the שבת-acceptance and שבת-release rows, and nothing else', () => {
  assert.ok(EMPHASIS.test('מנחה וקבלת שבת'));
  assert.ok(EMPHASIS.test('ערבית מוצ״ש'));
  assert.ok(!EMPHASIS.test('שחרית ומוסף'));
  assert.ok(!EMPHASIS.test('מנחה'));
});
