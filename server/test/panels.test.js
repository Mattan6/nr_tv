const { test } = require('node:test');
const assert = require('node:assert');

const { isPanel, validateItem, PANEL_KEYS } = require('../src/store/panels');

test('recognises exactly the four panels', () => {
  assert.deepStrictEqual(PANEL_KEYS, ['announcements', 'shiurim', 'mazal', 'azkarot']);
  assert.strictEqual(isPanel('shiurim'), true);
  assert.strictEqual(isPanel('parnas'), false);
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
