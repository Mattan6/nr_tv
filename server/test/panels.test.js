const { test } = require('node:test');
const assert = require('node:assert');

const { isPanel, validateItem, validateSettings, PANEL_KEYS } = require('../src/store/panels');

test('recognises exactly the five panels', () => {
  assert.deepStrictEqual(PANEL_KEYS, ['announcements', 'shiurim', 'mazal', 'azkarot', 'ticker']);
  assert.strictEqual(isPanel('shiurim'), true);
  assert.strictEqual(isPanel('ticker'), true);
  assert.strictEqual(isPanel('parnas'), false);
  // 'settings' travels in the same document but is a single record, not a panel — it has
  // its own routes, and reaching the panel handler with it must 404.
  assert.strictEqual(isPanel('settings'), false);
  // Guards against inherited Object properties being treated as panels.
  assert.strictEqual(isPanel('constructor'), false);
});

test('accepts a valid item and trims it', () => {
  const result = validateItem('shiurim', { name: '  דף היומי  ', time: '06:45', by: 'הרב יגאל' });

  assert.deepStrictEqual(result, { fields: { name: 'דף היומי', time: '06:45', by: 'הרב יגאל' } });
});

test('strips keys outside the schema', () => {
  const result = validateItem('mazal', {
    names: 'משפחת בן חמו',
    occasion: 'להולדת הבן',
    id: 'forged-id',
    isActive: false,
    injected: 'nope',
  });

  assert.deepStrictEqual(Object.keys(result.fields).sort(), ['names', 'occasion']);
});

test('rejects a blank required field', () => {
  const result = validateItem('announcements', { text: '   ' });

  assert.deepStrictEqual(result, { errors: { text: 'שדה חובה' } });
});

test('rejects a malformed time', () => {
  assert.ok(validateItem('shiurim', { name: 'א', time: '25:00', by: 'ב' }).errors.time);
  assert.ok(validateItem('shiurim', { name: 'א', time: '6:45', by: 'ב' }).errors.time);
  assert.ok(validateItem('shiurim', { name: 'א', time: 'שש וחצי', by: 'ב' }).errors.time);
  assert.strictEqual(validateItem('shiurim', { name: 'א', time: '00:00', by: 'ב' }).errors, undefined);
  assert.strictEqual(validateItem('shiurim', { name: 'א', time: '23:59', by: 'ב' }).errors, undefined);
});

test('allows an optional field to be empty', () => {
  const result = validateItem('azkarot', { name: 'משה בן פרטונה ז״ל', detail: '', date: 'י״ח באלול' });

  assert.deepStrictEqual(result.fields, { name: 'משה בן פרטונה ז״ל', detail: '', date: 'י״ח באלול' });
});

test('preserves newlines inside announcement text', () => {
  const result = validateItem('announcements', { text: '  שורה ראשונה\nשורה שנייה  ' });

  assert.strictEqual(result.fields.text, 'שורה ראשונה\nשורה שנייה');
});

test('rejects an over-long field', () => {
  const result = validateItem('announcements', { text: 'א'.repeat(301) });

  assert.ok(result.errors.text);
});

test('rejects a non-string field', () => {
  assert.ok(validateItem('announcements', { text: { evil: true } }).errors.text);
  assert.ok(validateItem('announcements', {}).errors.text);
  assert.ok(validateItem('announcements', undefined).errors.text);
});

// --- Shabbat time overrides -------------------------------------------------------
//
// These cannot go through validateItem: its `required` rules exist to reject a blank,
// and here a blank is the most important valid value there is — it means "leave this
// time automatic".

test('accepts a time or a blank for every shabbat setting', () => {
  const result = validateSettings({
    shabbat: { candles: '18:00', kabbalat: '', shacharit: '07:45', mincha: '  18:13  ', arvit: '19:58' },
  });

  assert.strictEqual(result.errors, undefined);
  assert.deepStrictEqual(result.settings.shabbat, {
    candles: '18:00',
    kabbalat: '',
    shacharit: '07:45',
    mincha: '18:13',
    arvit: '19:58',
  });
});

test('fills in every shabbat key even when the body omits them', () => {
  const result = validateSettings({ shabbat: { mincha: '18:00' } });

  assert.deepStrictEqual(Object.keys(result.settings.shabbat).sort(), [
    'arvit',
    'candles',
    'kabbalat',
    'mincha',
    'shacharit',
  ]);
  assert.strictEqual(result.settings.shabbat.candles, '');
});

test('rejects a malformed shabbat time', () => {
  assert.ok(validateSettings({ shabbat: { candles: '25:00' } }).errors.candles);
  assert.ok(validateSettings({ shabbat: { mincha: '6:45' } }).errors.mincha);
  assert.ok(validateSettings({ shabbat: { arvit: 'שבע וחצי' } }).errors.arvit);
  assert.strictEqual(validateSettings({ shabbat: { candles: '00:00' } }).errors, undefined);
  assert.strictEqual(validateSettings({ shabbat: { candles: '23:59' } }).errors, undefined);
});

test('treats a non-string shabbat value as blank rather than erroring', () => {
  assert.strictEqual(validateSettings({ shabbat: { candles: 42 } }).settings.shabbat.candles, '');
  assert.strictEqual(validateSettings({ shabbat: null }).settings.shabbat.candles, '');
  assert.strictEqual(validateSettings(undefined).settings.shabbat.candles, '');
});

test('strips keys outside the shabbat schema', () => {
  const result = validateSettings({ shabbat: { candles: '18:00', injected: '99:99' } });

  assert.strictEqual(result.errors, undefined);
  assert.strictEqual(result.settings.shabbat.injected, undefined);
});
