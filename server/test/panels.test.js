const { test } = require('node:test');
const assert = require('node:assert');

const { isPanel, validateItem, validateSettings, PANEL_KEYS } = require('../src/store/panels');

test('recognises exactly the twelve panels', () => {
  assert.deepStrictEqual(PANEL_KEYS, [
    'announcements',
    'shiurim',
    'shiurimShabbat',
    'mazal',
    'azkarot',
    'dedication',
    'ticker',
    'roshDay1',
    'roshDay2',
    'roshMechirot',
    'roshDedication',
    'roshTicker',
  ]);
  assert.strictEqual(isPanel('shiurim'), true);
  assert.strictEqual(isPanel('roshDay1'), true);
  assert.strictEqual(isPanel('roshMechirot'), true);
  assert.strictEqual(isPanel('shiurimShabbat'), true);
  assert.strictEqual(isPanel('dedication'), true);
  assert.strictEqual(isPanel('ticker'), true);
  assert.strictEqual(isPanel('parnas'), false);
  // 'settings' travels in the same document but is a single record, not a panel — it has
  // its own routes, and reaching the panel handler with it must 404.
  assert.strictEqual(isPanel('settings'), false);
  // Guards against inherited Object properties being treated as panels.
  assert.strictEqual(isPanel('constructor'), false);
});

// The two שיעורים panels are one schema mounted twice — חול and שבת. They must validate
// identically, because the admin screens and the controller are the same code for both;
// a divergence would mean a time the gabbai can save on one list and not the other.
test('the שבת שיעורים panel validates exactly like the חול one', () => {
  const item = { name: 'שיעור בפרשה', time: '16:15', by: 'הרב מוטה' };
  assert.deepStrictEqual(
    validateItem('shiurimShabbat', item).fields,
    validateItem('shiurim', item).fields
  );

  for (const bad of [{ ...item, time: '25:00' }, { ...item, name: '' }, { ...item, by: '' }]) {
    assert.deepStrictEqual(
      Object.keys(validateItem('shiurimShabbat', bad).errors || {}),
      Object.keys(validateItem('shiurim', bad).errors || {})
    );
  }
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

// הקדשת הלוח. Three lines on the שבת board — a lead ("מוקדש להצלחת"), the name it is
// dedicated to, and a closing note ("בכל העניינים"). The note is optional because plenty of
// dedications end at the name, and the card simply drops the line when it is blank.
test('the dedication panel requires a lead and a name but not the closing note', () => {
  const full = { lead: 'מוקדש להצלחת', names: 'משפחת מזוז', note: 'בכל העניינים' };
  assert.deepStrictEqual(validateItem('dedication', full).fields, full);

  assert.deepStrictEqual(validateItem('dedication', { ...full, note: '  ' }).fields, {
    ...full,
    note: '',
  });

  assert.deepStrictEqual(validateItem('dedication', { lead: '', names: '', note: 'בכל העניינים' }).errors, {
    lead: 'שדה חובה',
    names: 'שדה חובה',
  });
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

// --- Rich הודעות ------------------------------------------------------------------

const RICH_ID = '3f2b1a0c-4d5e-6f70-8192-a3b4c5d6e7f8.jpg';

test('a doc on the announcements panel becomes the source of truth for text', () => {
  const { fields, errors } = validateItem('announcements', {
    text: 'טקסט שהלקוח שלח ואין לסמוך עליו',
    doc: { blocks: [{ type: 'p', spans: [{ text: 'מה שנשמר באמת' }] }] },
  });

  assert.strictEqual(errors, undefined);
  assert.strictEqual(fields.text, 'מה שנשמר באמת');
  assert.strictEqual(fields.doc.blocks.length, 1);
});

// Without this, Object.assign in updateItem would leave the old rich content in place
// while `text` said something else — and every renderer prefers `doc`.
test('a write with no doc clears any doc the item already had', () => {
  const { fields } = validateItem('announcements', { text: 'הודעה פשוטה' });

  assert.strictEqual(fields.text, 'הודעה פשוטה');
  assert.strictEqual(fields.doc, null);
});

test('an invalid doc reports under the doc key, which is the form field', () => {
  const { errors } = validateItem('announcements', { doc: { blocks: [{ type: 'iframe' }] } });

  assert.ok(errors.doc);
});

test('only announcements take a doc — the other panels ignore it', () => {
  const { fields } = validateItem('ticker', { text: 'שורה', doc: { blocks: [] } });

  assert.strictEqual(fields.doc, undefined);
  assert.strictEqual(fields.text, 'שורה');
});

test('an image-only doc saves, even though its derived text is empty', () => {
  const { fields, errors } = validateItem('announcements', {
    doc: { blocks: [{ type: 'img', id: RICH_ID, alt: '' }] },
  });

  assert.strictEqual(errors, undefined);
  assert.strictEqual(fields.text, '');
});

// --- ראש השנה -------------------------------------------------------------------
//
// The two day panels are one schema mounted twice, like the two שיעורים panels above, and
// they differ from every other panel in one way that matters: `time` is optional. Four rows
// on the board carry no time at all — ערבית ליל החג, עת שערי רצון and מוסף — because they
// follow whatever came before them and the shul posts no minute for them.

test('a ראש השנה row may carry no time and no חזן', () => {
  const { fields, errors } = validateItem('roshDay1', {
    name: 'מוסף',
    time: '',
    chazan: '',
    kind: 'regular',
  });

  assert.strictEqual(errors, undefined);
  assert.deepStrictEqual(fields, { name: 'מוסף', time: '', chazan: '', kind: 'regular' });
});

test('a ראש השנה row still rejects a malformed time when one is given', () => {
  assert.ok(validateItem('roshDay1', { name: 'שחרית', time: '25:00' }).errors.time);
  assert.ok(validateItem('roshDay1', { name: 'שחרית', time: '7:30' }).errors.time);
  assert.strictEqual(validateItem('roshDay1', { name: 'שחרית', time: '07:30' }).errors, undefined);
});

test('the two ראש השנה day panels validate identically', () => {
  const item = { name: 'תקיעת שופר', time: '09:45', chazan: 'הבעל תוקע', kind: 'shofar' };

  assert.deepStrictEqual(validateItem('roshDay2', item).fields, validateItem('roshDay1', item).fields);
});

// The row's kind is a stored field rather than a regex over its Hebrew name — see ROW_KINDS.
// An unknown value has to be rejected, or the board would fall back to the plain treatment
// and the שופר card would quietly lose the row it counts down to.
test('a ראש השנה row rejects a kind outside the enum', () => {
  assert.strictEqual(validateItem('roshDay2', { name: 'שחרית', kind: 'confetti' }).errors.kind, 'ערך לא תקין');
});

test('a blank kind is allowed and stored blank — the board reads it as regular', () => {
  const { fields, errors } = validateItem('roshDay2', { name: 'שחרית', kind: '' });

  assert.strictEqual(errors, undefined);
  assert.strictEqual(fields.kind, '');
});

test('מכירת מצוות validates both of its enums', () => {
  assert.ok(validateItem('roshMechirot', { label: 'פרנסה', day: 'day3' }).errors.day);
  assert.ok(validateItem('roshMechirot', { label: 'פרנסה', kind: 'raffle' }).errors.kind);
  assert.strictEqual(
    validateItem('roshMechirot', { label: 'פרנסה', day: 'day1', kind: 'general' }).errors,
    undefined
  );
});

// A חג dedication is bought separately from a שבת one, so it is its own list — but it is the
// same three fields, shared by reference on the server. A divergence could only be a bug.
test('the חג dedication takes exactly the same fields as the שבת one', () => {
  const item = { lead: 'מוקדש להצלחת', names: 'משפחת מזוז', note: 'בכל העניינים' };

  assert.deepStrictEqual(validateItem('roshDedication', item).fields, validateItem('dedication', item).fields);
  assert.deepStrictEqual(validateItem('roshDedication', { lead: '', names: '' }).errors, {
    lead: 'שדה חובה',
    names: 'שדה חובה',
  });
});

test('the חג ticker takes one required line, like the shared one', () => {
  assert.strictEqual(validateItem('roshTicker', { text: '  שנה טובה  ' }).fields.text, 'שנה טובה');
  assert.ok(validateItem('roshTicker', { text: '' }).errors.text);
});
