const { test } = require('node:test');
const assert = require('node:assert');

const { normalize, screen } = require('../src/jokes/filter');

test('normalize turns <br> into newlines and strips tags and entities', () => {
  assert.strictEqual(
    normalize('  שלום<br />עולם&nbsp;<b>שוב</b>  '),
    'שלום\nעולם שוב'
  );
});

// The site stores a gershayim as geresh + acute accent; left alone it shows on the wall
// as מנכ׳´ל.
test('normalize repairs the mangled gershayim', () => {
  assert.strictEqual(normalize('מנכ׳´ל'), 'מנכ"ל');
});

// Five REAL jokes scraped from yo-yoo on 2026-07-24. Three must be rejected and two
// accepted; this is the exact trade the design made when the "must contain ?" rule was
// dropped, so it is asserted verbatim rather than paraphrased.
const REAL = {
  tooLong:
    'מה זה 3 בנים שלא יודעים לשחק כדורגל / אבא:למה את לא משחקת / בן:כי לא רוצה / אבא:למה לא / בן:כי / אבא:כי למה בדיוק בואי?',
  repeatedWord: 'אני: את לא יודעת מה זה בחיים.. / אני: ממש לא יודעת ? / אני: ממש / אני: ממש לא יודעת ?',
  bangs: "האיש : למה את 'יודעת מכי הגיעה !!!!!!!!!!!!!!! / אני : לא אני בטוח מאוד",
  coherent: 'הבן קטן לאמא שלו בקול צעקה: הריצי מהר! הכלב שלנו גנב לי משהו!',
  weakButClean: 'מהו ההבדל בין תפוח לתפוזה? תשובה: סוגר.',
};

test('rejects the real mangled samples', () => {
  assert.strictEqual(screen(REAL.tooLong).reason, 'length');
  assert.strictEqual(screen(REAL.repeatedWord).reason, 'word-repeat');
  assert.strictEqual(screen(REAL.bangs).reason, 'punct-repeat');
});

// Documents the accepted residual: no syntactic rule detects "not funny".
test('accepts the real coherent samples, including the known weak one', () => {
  assert.strictEqual(screen(REAL.coherent).ok, true);
  assert.strictEqual(screen(REAL.weakButClean).ok, true);
});

test('each rule rejects with its own reason', () => {
  const cases = [
    ['קצר מדי.', 'length'],
    ['א'.repeat(120), 'length'],
    ['שורה אחת פה\nשורה שתיים פה\nשלוש כאן\nוארבע כאן', 'lines'],
    ['מה אמר הקיר לקיר השני? hello ניפגש בפינה', 'latin'],
    ['123 456 789 <> {} [] () 321 654 987 111', 'hebrew-ratio'],
    ['מה אמר הקיר לקיר השני??? ניפגש שם בפינה', 'punct-repeat'],
    // Bare-word equality, so the repeats must be the same word — שהילד and והילד carry
    // prefixes and count as different words.
    ['הילד רץ מהר הילד נפל חזק הילד קם ובכה', 'word-repeat'],
    // A 2-letter label: word-repeat skips words under 3 letters, so this is the case
    // speaker-repeat actually exists for. A longer label like דני: is caught by
    // word-repeat first, which is fine — both mean the same mangled dump.
    ['בן: שלום לך\nבן: מה נשמע\nבן: אני הולך הביתה', 'speaker-repeat'],
    ['אבא אמר', 'length'],
    // 23 two-letter words. The MAX_WORDS ceiling is all but unreachable under the
    // 110-character cap — it needs an average word below ~4 characters — so it is a
    // backstop, and only a contrived string like this reaches it. MIN_WORDS below is the
    // half of the rule that fires in practice.
    ['מי מה לי לך לו בו בה זה זו כה גם רק אך אז עד כי אם או של את הם הן פה', 'word-count'],
    ['מה אמר הקיר לקיר וההתקוממויותיהם השני בפינה', 'long-word'],
    ['מה אמר הקיר לקיר השני? ניפגש בפינה 12345', 'digits'],
  ];
  for (const [text, reason] of cases) {
    assert.strictEqual(screen(text).reason, reason, `expected ${reason} for: ${text}`);
  }
});

// Hebrew prefixes (ו/ב/כ/ל/מ/ש/ה) attach to words, so the blocklist must tolerate them —
// but only where doing so cannot misfire.
test('blocklist tolerates Hebrew prefixes', () => {
  assert.strictEqual(screen('מה אומרים לשמנה שצועקת עליך ברחוב? קודם תורידי טון').reason, 'blocked');
  assert.strictEqual(screen('אתמול ישבתי שעה בשירותים וצחקתי על כל מי שאמר לי לא').reason, 'blocked');
});

// The reason prefix tolerance is capped at index 2 and split across two lists: naive
// substring matching rejects מתחת for containing תחת.
test('blocklist does not misfire on innocent words', () => {
  assert.strictEqual(screen('מה קורה כשכרוב וכרובית מתחתנים? הם נהיים כרובי משפחה').ok, true);
  assert.strictEqual(screen('הבאתי שמן זית וכוסות לשולחן וכולם היו מרוצים מאוד').ok, true);
});
