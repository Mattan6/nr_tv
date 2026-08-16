import test from 'node:test';
import assert from 'node:assert/strict';
import { screenSegment, shabbatFriday, upcomingSaturday } from '../src/components/display/displayData.js';

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
