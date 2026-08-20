import test from 'node:test';
import assert from 'node:assert/strict';
import { parashaAt, upcomingSaturday, shabbatAnchors } from '../src/components/display/displayData.js';

// The parasha name the board posts is read off the SAME Hebcal /shabbat response the candle
// lighting and havdalah come from, and it is matched to a day the same way they are — by local
// calendar date against the Shabbat `upcomingSaturday` names, never by position in the items
// array. These tests pin that: they are the parasha-side companion to the shabbatAnchors tests
// in screenSegment.test.js.
//
// Response shapes below are the real ones, captured from hebcal.com/shabbat for Nitzan's
// coordinates. Note the two date formats Hebcal mixes in one array: `candles` and `havdalah`
// carry a full offset-stamped timestamp, `parashat` carries a bare 'YYYY-MM-DD'. Matching is
// done on the first ten characters for exactly that reason.
const at = (iso) => new Date(iso);

// 2026-08-22 is a Saturday; 08-21 is the Friday before it.
const KI_TEITZEI = {
  items: [
    { title: 'Candle lighting: 18:58', category: 'candles', date: '2026-08-21T18:58:00+03:00' },
    { title: 'Parashat Ki Teitzei', hebrew: 'פרשת כי־תצא', category: 'parashat', date: '2026-08-22' },
    { title: 'Havdalah: 19:55', category: 'havdalah', date: '2026-08-22T19:55:00+03:00' },
  ],
};

test('reads the parasha of the Shabbat upcomingSaturday names', () => {
  const saturday = upcomingSaturday(at('2026-08-20T14:00:00+03:00'));
  assert.equal(parashaAt(KI_TEITZEI, saturday), 'פרשת כי־תצא');
});

// Saturday itself, not just the days leading up to it. The שבת board is on the wall through
// Saturday night (see screenSegment), and Hebcal keeps returning that same Shabbat's block all
// day Saturday — so the name must not blank out on the one day it is read most.
test('still reads it on Saturday itself', () => {
  const saturday = upcomingSaturday(at('2026-08-22T10:30:00+03:00'));
  assert.equal(parashaAt(KI_TEITZEI, saturday), 'פרשת כי־תצא');
});

// The point of the whole function. A response carrying a parasha for a DIFFERENT Shabbat than
// the one the rest of the board is describing must not be posted under this week's zmanim: the
// name is pinned to `saturday`, so an item for any other date is not a fallback, it is a miss.
//
// This is the same discipline shabbatAnchors already applies to candles and havdalah, and it
// is what makes the value independent of where Hebcal happens to put it in the array — a bare
// items.find() would return whichever parashat item came first.
test('ignores a parasha belonging to a different Shabbat', () => {
  const nextWeek = {
    items: [
      { title: 'Parashat Ki Tavo', hebrew: 'פרשת כי־תבוא', category: 'parashat', date: '2026-08-29' },
    ],
  };
  const saturday = upcomingSaturday(at('2026-08-20T14:00:00+03:00')); // 2026-08-22
  assert.equal(parashaAt(nextWeek, saturday), '');
});

test('picks this Shabbat out of a response listing more than one parasha', () => {
  const both = {
    items: [
      { title: 'Parashat Ki Tavo', hebrew: 'פרשת כי־תבוא', category: 'parashat', date: '2026-08-29' },
      { title: 'Parashat Ki Teitzei', hebrew: 'פרשת כי־תצא', category: 'parashat', date: '2026-08-22' },
    ],
  };
  const saturday = upcomingSaturday(at('2026-08-20T14:00:00+03:00'));
  assert.equal(parashaAt(both, saturday), 'פרשת כי־תצא');
});

// A Shabbat whose reading is a festival's carries no parashat item at all — Rosh Hashanah
// falls on Shabbat 2026-09-12, and Hebcal returns candles and havdalah with no parasha between
// them. The empty string is what ShabbatDisplay turns into 'שַׁבַּת קֹדֶשׁ' and DedicationCard into
// 'לוּחַ הַשַּׁבָּת', so this is the path those two fallbacks exist for.
test('answers empty on a Shabbat that has no parasha', () => {
  const roshHashanah = {
    items: [
      { title: 'Candle lighting: 18:16', category: 'candles', date: '2026-09-11T18:16:00+03:00' },
      { title: 'Havdalah: 19:13', category: 'havdalah', date: '2026-09-13T19:13:00+03:00' },
    ],
  };
  assert.equal(parashaAt(roshHashanah, upcomingSaturday(at('2026-09-10T14:00:00+03:00'))), '');
});

// Never throws and never invents, on every shape a failed or half-built load can hand it.
// The Hebcal leg is one of six in an allSettled, and a rejected one is written back as null.
test('answers empty rather than throwing on a missing or malformed response', () => {
  const saturday = upcomingSaturday(at('2026-08-20T14:00:00+03:00'));
  assert.equal(parashaAt(null, saturday), '');
  assert.equal(parashaAt(undefined, saturday), '');
  assert.equal(parashaAt({}, saturday), '');
  assert.equal(parashaAt({ items: [] }, saturday), '');
  assert.equal(parashaAt({ items: [{ category: 'parashat', hebrew: 'פרשת נח' }] }, saturday), '');
  assert.equal(parashaAt(KI_TEITZEI, null), '');
  assert.equal(parashaAt(KI_TEITZEI, new Date(NaN)), '');
});

// The two readers of this one response must agree on which Shabbat it is describing. If they
// ever diverge, the board posts one week's parasha over another week's candle lighting — the
// exact failure that anchoring the name to a date is here to prevent.
test('agrees with shabbatAnchors about which Shabbat the response describes', () => {
  const saturday = upcomingSaturday(at('2026-08-20T14:00:00+03:00'));
  const anchors = shabbatAnchors(KI_TEITZEI, saturday);
  assert.equal(parashaAt(KI_TEITZEI, saturday), 'פרשת כי־תצא');
  assert.equal(anchors.candles.slice(0, 10), '2026-08-21');
  assert.equal(anchors.havdalah.slice(0, 10), '2026-08-22');
});
