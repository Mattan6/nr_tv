import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROSH_HASHANAH,
  holidayAnchors,
  resolveRoshTimes,
  mechirotPages,
  countdownTo,
  rowStyle,
  hebrewYearLetters,
  hebrewYearOf,
  weekdayName,
} from '../src/components/rosh/roshData.js';
import { HEBCAL_ROSH_5787 } from './fixtures/hebcal-rosh-hashanah.js';

// --- holidayAnchors ------------------------------------------------------------------
//
// One חג out of a /hebcal response. The two traps it exists to avoid are both live in the
// fixture: ערב ראש השנה looks like the חג and lands a day earlier, and the Shabbat after the
// חג carries its own candles and havdalah further down the same array.

test('finds the two חג days, not ערב ראש השנה the day before', () => {
  const a = holidayAnchors(HEBCAL_ROSH_5787, ROSH_HASHANAH);

  assert.equal(a.day1Date.getFullYear(), 2026);
  assert.equal(a.day1Date.getMonth(), 8);
  assert.equal(a.day1Date.getDate(), 12);
  assert.equal(a.day2Date.getDate(), 13);
  assert.equal(a.lastDate.getDate(), 13);
});

test('takes the חג candles and הבדלה, not the following Shabbat’s', () => {
  const a = holidayAnchors(HEBCAL_ROSH_5787, ROSH_HASHANAH);

  // ערב יום א׳ — the evening before the חג opens.
  assert.equal(a.candles1, '2026-09-11T18:32:00+03:00');
  // ליל יום ב׳ — lit ON day one, at nightfall, from an existing flame.
  assert.equal(a.candles2, '2026-09-12T19:28:00+03:00');
  assert.equal(a.havdalah, '2026-09-13T19:27:00+03:00');
  // Not 18:23 / 19:18, which is the Shabbat six days later.
});

// The same function, the same response, a one-day חג. This is the whole claim that the
// machinery generalises to יום כיפור, סוכות, פסח and שבועות rather than being ראש השנה code
// wearing a parameter.
test('is parameterised by title and length — יום כיפור is one day with no second candle', () => {
  const a = holidayAnchors(HEBCAL_ROSH_5787, { title: 'Yom Kippur', days: 1 });

  assert.equal(a.day1Date.getDate(), 21);
  assert.equal(a.day2Date, null);
  assert.equal(a.candles1, '2026-09-20T18:21:00+03:00');
  assert.equal(a.candles2, null);
  assert.equal(a.havdalah, '2026-09-21T19:16:00+03:00');
});

test('a title that matches only an ערב day finds nothing', () => {
  // 'Erev Rosh Hashana' is in the fixture as a holiday/major item, and must not be reachable:
  // it carries no yomtov flag.
  const a = holidayAnchors(HEBCAL_ROSH_5787, { title: 'Erev Rosh Hashana', days: 1 });

  assert.equal(a.day1Date, null);
});

test('yields nulls rather than a neighbour’s time when the חג is not in the window', () => {
  const a = holidayAnchors({ items: [] }, ROSH_HASHANAH);

  assert.equal(a.day1Date, null);
  assert.equal(a.candles1, null);
  assert.equal(a.candles2, null);
  assert.equal(a.havdalah, null);
});

test('a חג present with no candle items yields the dates and null times', () => {
  const a = holidayAnchors(
    { items: [{ title: 'Rosh Hashana 5787', date: '2026-09-12', category: 'holiday', yomtov: true }] },
    ROSH_HASHANAH
  );

  assert.equal(a.day1Date.getDate(), 12);
  assert.equal(a.candles1, null);
  assert.equal(a.havdalah, null);
});

test('survives a malformed response instead of throwing under the board', () => {
  for (const bad of [null, undefined, {}, { items: null }, { items: 'nope' }]) {
    assert.equal(holidayAnchors(bad, ROSH_HASHANAH).day1Date, null);
  }
  assert.equal(holidayAnchors(HEBCAL_ROSH_5787, {}).day1Date, null);
  assert.equal(holidayAnchors(HEBCAL_ROSH_5787).day1Date, null);
});

// --- resolveRoshTimes ----------------------------------------------------------------

test('formats the anchors on Jerusalem’s clock', () => {
  const t = resolveRoshTimes(holidayAnchors(HEBCAL_ROSH_5787, ROSH_HASHANAH), {});

  assert.deepEqual(t, { candles1: '18:32', candles2: '19:28', havdalah: '19:27' });
});

test('a pinned override beats the anchor and a blank falls back to it', () => {
  const a = holidayAnchors(HEBCAL_ROSH_5787, ROSH_HASHANAH);
  const t = resolveRoshTimes(a, { candles1: '18:15', candles2: '', havdalah: '' });

  assert.equal(t.candles1, '18:15');
  assert.equal(t.candles2, '19:28');
  assert.equal(t.havdalah, '19:27');
});

// An override is a stated fact, not a derivation, so it is strictly more robust than the
// value it replaces — it survives a total Hebcal outage.
test('a pinned override still shows when Hebcal gave nothing at all', () => {
  const t = resolveRoshTimes({}, { candles1: '18:15' });

  assert.equal(t.candles1, '18:15');
  assert.equal(t.candles2, null);
  assert.equal(t.havdalah, null);
});

test('no anchors and no overrides is three nulls, never a stale time', () => {
  assert.deepEqual(resolveRoshTimes(), { candles1: null, candles2: null, havdalah: null });
});

// --- mechirotPages -------------------------------------------------------------------

test('reproduces the mockup’s split: ten items become 4 + 4 + 2', () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ id: `a${i}`, label: `x${i}`, day: 'day1' }));
  const pages = mechirotPages(items, 4);

  // Not an even 4 + 3 + 3: size comes from the page count, which is the mockup's arithmetic
  // and what the card was laid out around.
  assert.deepEqual(pages.map((p) => p.rows.length), [4, 4, 2]);
  assert.equal(pages[0].rows[0].num, 1);
  assert.equal(pages[2].rows[1].num, 10);
});

test('keeps the two days on separate pages and numbers each from one', () => {
  const items = [
    ...Array.from({ length: 10 }, (_, i) => ({ id: `a${i}`, day: 'day1' })),
    ...Array.from({ length: 8 }, (_, i) => ({ id: `b${i}`, day: 'day2' })),
  ];
  const pages = mechirotPages(items, 4);

  // Five pages, five dots — which is what the board's dot strip renders.
  assert.deepEqual(pages.map((p) => p.day), ['day1', 'day1', 'day1', 'day2', 'day2']);
  assert.deepEqual(pages.map((p) => p.rows.length), [4, 4, 2, 4, 4]);
  assert.equal(pages[3].rows[0].num, 1);
  assert.equal(pages[4].rows[3].num, 8);
});

test('a missing day reads as day1, and an empty list is no pages at all', () => {
  assert.equal(mechirotPages([{ id: 'a' }], 4)[0].day, 'day1');
  assert.deepEqual(mechirotPages([], 4), []);
  assert.deepEqual(mechirotPages(), []);
});

test('a day with fewer items than a page still gets exactly one page', () => {
  const pages = mechirotPages([{ id: 'a', day: 'day2' }, { id: 'b', day: 'day2' }], 4);

  assert.equal(pages.length, 1);
  assert.equal(pages[0].day, 'day2');
  assert.deepEqual(pages[0].rows.map((r) => r.num), [1, 2]);
});

// --- countdownTo ---------------------------------------------------------------------
//
// Israel's wall clock, never the device's — the same property every other time on this board
// has. The instants below are written in UTC so the assertions hold whatever zone the test
// runner is in; 2026-09 is Israel summer time, UTC+3.

test('counts down on Israel’s clock', () => {
  const target = new Date(2026, 8, 13, 12);

  // 04:45Z is 07:45 in Nitzan, two hours before תקיעת שופר at 09:45.
  assert.equal(countdownTo(new Date('2026-09-13T04:45:00Z'), target, '09:45'), '02:00:00');
});

test('spans days, and clamps at zero once the time has passed', () => {
  const target = new Date(2026, 8, 13, 12);

  // The day before at 07:45 Israel time (04:45Z): a full day plus the same two hours.
  assert.equal(countdownTo(new Date('2026-09-12T04:45:00Z'), target, '09:45'), '26:00:00');
  // And exactly a day, to pin the day-boundary arithmetic on its own.
  assert.equal(countdownTo(new Date('2026-09-12T06:45:00Z'), target, '09:45'), '24:00:00');
  // Afterwards it must show nothing rather than counting up or going negative.
  assert.equal(countdownTo(new Date('2026-09-13T08:00:00Z'), target, '09:45'), '00:00:00');
  assert.equal(countdownTo(new Date('2026-09-20T08:00:00Z'), target, '09:45'), '00:00:00');
});

test('yields a placeholder rather than a wrong number when it cannot know', () => {
  assert.equal(countdownTo(new Date(), null, '09:45'), '--:--:--');
  assert.equal(countdownTo(new Date(), new Date(2026, 8, 13, 12), ''), '--:--:--');
  assert.equal(countdownTo(new Date(), new Date(2026, 8, 13, 12), undefined), '--:--:--');
  assert.equal(countdownTo(new Date(), new Date('nonsense'), '09:45'), '--:--:--');
  assert.equal(countdownTo(new Date(), new Date(2026, 8, 13, 12), '9:45 pm'), '--:--:--');
});

// --- rowStyle ------------------------------------------------------------------------

test('separates תשליך from פיוט in meaning while matching them in colour', () => {
  // They render identically — the mockup styled עת שערי רצון and תשליך the same blue.
  assert.deepEqual(rowStyle('tashlich'), rowStyle('piyut'));
  // But they are distinct kinds, because only one of them feeds a card.
  assert.notEqual(rowStyle('shofar').nameColor, rowStyle('regular').nameColor);
  assert.notEqual(rowStyle('shiur').nameColor, rowStyle('mechirot').nameColor);
});

test('an unknown or blank kind falls back to the plain row', () => {
  assert.deepEqual(rowStyle('nonsense'), rowStyle('regular'));
  assert.deepEqual(rowStyle(''), rowStyle('regular'));
  assert.deepEqual(rowStyle(undefined), rowStyle('regular'));
  // Inherited Object properties must not resolve to a style.
  assert.deepEqual(rowStyle('constructor'), rowStyle('regular'));
});

// --- The Hebrew year and the weekday -------------------------------------------------
//
// Both of these are written by hand rather than asked of Intl, and each for its own reason.
//
// The year: `Intl.DateTimeFormat('he-u-ca-hebrew', {year: 'numeric'})` returns '5787' on this
// Node build, not 'תשפ״ז' — the Hebrew numbering system is not in its ICU data, and
// `NumberFormat` with `numberingSystem: 'hebr'` answers '5,787'. A browser with full ICU may
// well answer differently, and a masthead that reads 'ראש השנה תשפ״ז' on the TV and
// 'ראש השנה 5787' in the test run is worse than one that never asked.

test('converts a Hebrew year to its letters', () => {
  assert.equal(hebrewYearLetters(5787), 'תשפ״ז');
  assert.equal(hebrewYearLetters(5786), 'תשפ״ו');
  assert.equal(hebrewYearLetters(5788), 'תשפ״ח');
  assert.equal(hebrewYearLetters(5790), 'תש״צ');
});

// 15 and 16 are written טו and טז rather than יה and יו, which spell divine names. A year
// ending in either is decades away, and getting it wrong would put one on a shul wall.
test('writes 15 and 16 as טו and טז', () => {
  assert.equal(hebrewYearLetters(5715), 'תשט״ו');
  assert.equal(hebrewYearLetters(5716), 'תשט״ז');
});

test('handles a year needing a repeated letter, and refuses nonsense', () => {
  assert.equal(hebrewYearLetters(5800), 'ת״ת');
  for (const bad of [null, undefined, 'תשפז', NaN, 0, -5787, 5.5]) {
    assert.equal(hebrewYearLetters(bad), '');
  }
});

test('reads the Hebrew year off a date and letters it', () => {
  // 12 Sep 2026 is 1 Tishrei 5787.
  assert.equal(hebrewYearOf(new Date(2026, 8, 12, 12)), 'תשפ״ז');
  assert.equal(hebrewYearOf(null), '');
  assert.equal(hebrewYearOf(new Date('nonsense')), '');
});

// Hebrew's long weekday already carries the word יום ('יום שבת'), so the two call sites need
// different halves of it: the תשליך card reads 'תשליך · יום שבת' and the מכירות heading reads
// 'יום א׳ דראש השנה · שבת'. Naively interpolating the long form into the second gives
// 'יום א׳ דראש השנה · יום שבת'.
test('gives the weekday with and without its יום prefix', () => {
  const saturday = new Date(2026, 8, 12, 12);
  const sunday = new Date(2026, 8, 13, 12);

  assert.equal(weekdayName(saturday), 'יום שבת');
  assert.equal(weekdayName(sunday), 'יום ראשון');
  assert.equal(weekdayName(saturday, { bare: true }), 'שבת');
  assert.equal(weekdayName(sunday, { bare: true }), 'ראשון');
});

test('the weekday is blank rather than wrong when there is no date', () => {
  assert.equal(weekdayName(null), '');
  assert.equal(weekdayName(undefined, { bare: true }), '');
  assert.equal(weekdayName(new Date('nonsense')), '');
});
