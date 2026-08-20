// The editable panels. Every panel is a list of items carrying an id and an isActive
// flag; they differ only in their text fields. Describing that difference as data —
// rather than as one set of near-identical handlers per panel — is what lets one
// controller and one pair of React screens serve all of them, and is why adding
// הקדשת הלוח below was a schema entry rather than a route.
const { validateDoc } = require('./richText');

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_LEN = 300;

// A real synagogue's panels hold a handful of items each — a few announcements, a
// handful of shiurim. This cap is ~two orders of magnitude above that, so it never
// bothers the gabbai; it exists only to bound how large content.json can grow, since
// the API is unauthenticated by design (see the spec's "On the absence of auth") and
// every write serializes and fsyncs the whole document.
const MAX_ITEMS = 500;

// One schema, mounted as two panels: שיעורי חול and שיעורי שבת. Shared by reference rather
// than written twice because one controller and one pair of admin screens serve both, so a
// divergence between them could only ever be a bug — a time the gabbai can save on one list
// and not on the other. validateItem only reads it, so the shared reference is safe.
const SHIUR_FIELDS = {
  name: { required: true },
  time: { required: true, pattern: TIME_RE, message: 'שעה חייבת להיות בפורמט 06:45' },
  by: { required: true },
};

// Lifted out of the `dedication` entry below so הקדשת לוח השבת and הקדשת לוח החג share one
// definition, for the same reason SHIUR_FIELDS above is shared: one controller and one pair of
// admin screens serve both lists, so a field that differed between them could only be a bug.
const DEDICATION_FIELDS = {
  lead: { required: true },
  names: { required: true },
  note: { required: false },
};

// The kinds a ראש השנה prayer row may carry.
//
// The board's mockup decided a row's treatment by running four regexes over its Hebrew NAME.
// That is fine while the strings are fixed and wrong the moment the gabbai writes תקיעות שופר
// instead of תקיעת שופר: the highlight silently vanishes and — worse — the תקיעת שופר card at
// the top of the board goes blank, because the same regex is what finds the row it counts
// down to. Storing the kind is what makes both stable under editing.
//
// `piyut` and `tashlich` render identically (the blue treatment). They are separate values
// anyway, because only one of them feeds a card: עת שערי רצון must never be picked up as the
// תשליך row. The mockup fused appearance with meaning; this is where they come apart.
const ROW_KINDS = ['regular', 'shiur', 'shofar', 'tashlich', 'piyut', 'mechirot'];

const MECHIRA_DAYS = ['day1', 'day2'];
const MECHIRA_KINDS = ['auction', 'general'];

// One schema, mounted as the two ראש השנה day panels.
//
// `time` is optional, and that is load-bearing rather than lax: four rows on the board carry
// no time at all — ערבית ליל החג, עת שערי רצון and מוסף — because they follow whatever came
// before them and the shul posts no minute for them. Only a NON-EMPTY time has to look like a
// time, which is exactly what the optional branch of validateItem below already does.
//
// `chazan` is the row's detail line and carries a different thing in each kind of row: the חזן
// on a תפילה row, the מגיד שיעור on a שיעור, the גבאי on מכירת מצוות, and the location on
// תשליך ("בבית משפחת רחמין"). Its admin label is "חזן / פרטים" for that reason.
const ROSH_ROW_FIELDS = {
  name: { required: true },
  time: { required: false, pattern: TIME_RE, message: 'שעה חייבת להיות בפורמט 06:45' },
  chazan: { required: false },
  kind: { required: false, values: ROW_KINDS },
};

const PANELS = {
  announcements: {
    text: { required: true },
  },
  // Two lists, because a שיעור that meets on a weekday and one that meets on שבת are
  // different events; before the split both boards drew from one list and each showed the
  // other's. Which list reaches a screen is decided by the day, not by the layout — see
  // useDisplayModel.
  shiurim: SHIUR_FIELDS,
  shiurimShabbat: SHIUR_FIELDS,
  mazal: {
    names: { required: true },
    occasion: { required: true },
  },
  azkarot: {
    name: { required: true },
    detail: { required: false },
    date: { required: true },
  },
  // הקדשת הלוח — who this week's שבת board is dedicated for. Three fields rather than one
  // free-text line because the card sets them in three different types: a small steel lead,
  // the name in large serif, and a gold closing note. Handing the gabbai one string would
  // mean either losing that hierarchy or asking him to guess where the line breaks fall.
  //
  // `note` is optional: plenty of dedications end at the name, and the card drops the line
  // rather than leaving a gap when it is blank.
  dedication: DEDICATION_FIELDS,
  // The bottom ticker, one item per line. Modelled as a list rather than as one long
  // string so the gabbai never types the • separator himself, and so a single line can
  // be hidden without being deleted. The phone footer already renders a line per item;
  // the wall joins them back into one marquee.
  ticker: {
    text: { required: true },
  },
  // ראש השנה, on /tv?screen=rosh. Two day panels rather than one list with a day column, for
  // the reason shiurim/shiurimShabbat already settled: the gabbai edits "the יום ב׳ list", not
  // "a row carrying a day flag" — and twenty-one rows in one phone-sized list is not a screen
  // anyone can edit.
  roshDay1: ROSH_ROW_FIELDS,
  roshDay2: ROSH_ROW_FIELDS,
  roshMechirot: {
    label: { required: true },
    // Stores day1/day2 only. The mockup's "· שבת" and "· ראשון" suffixes are composed at
    // render from the Hebcal anchors, so the heading is right in תשפ״ח rather than frozen at
    // the weekday תשפ״ז happened to fall on.
    day: { required: false, values: MECHIRA_DAYS },
    kind: { required: false, values: MECHIRA_KINDS },
  },
  // A חג dedication is bought separately from a שבת one — the board's own footer says so — so
  // sharing one list would put the שבת dedicator's name on the חג board. Same three fields,
  // shared by reference; separate lists.
  roshDedication: DEDICATION_FIELDS,
  // Its own ticker. The חול and שבת boards keep sharing `ticker` above: splitting that was not
  // asked for and would either blank a live board or double every line into two lists to
  // maintain. A חג board has no ticker yet, so it gets one.
  roshTicker: {
    text: { required: true },
  },
};

const PANEL_KEYS = Object.keys(PANELS);

// hasOwnProperty, not `panel in PANELS`: otherwise 'constructor' and 'toString'
// would read as valid panel names.
const isPanel = (panel) => Object.prototype.hasOwnProperty.call(PANELS, panel);

// Returns { fields } or { errors }, never both. `fields` contains only schema keys,
// so a client cannot inject an id, an isActive, or anything else by sending it.
function validateItem(panel, body) {
  // הודעות may carry a rich document instead of a flat string. When one is present it is
  // the source of truth and `text` is derived from it (store/richText.js), so whatever
  // `text` the client also sent is ignored and the plain-field loop below is skipped.
  if (panel === 'announcements' && body != null && body.doc != null) {
    const { doc, text, error } = validateDoc(body.doc);
    // Reported under `doc`, which is the field key the admin form uses — see panelMeta.js.
    if (error) return { errors: { doc: error } };
    return { fields: { doc, text } };
  }

  const schema = PANELS[panel];
  const fields = {};
  const errors = {};

  for (const [key, rule] of Object.entries(schema)) {
    const raw = body == null ? undefined : body[key];
    const value = typeof raw === 'string' ? raw.trim() : '';

    if (!value) {
      if (rule.required) errors[key] = 'שדה חובה';
      else fields[key] = '';
      continue;
    }
    if (value.length > MAX_LEN) {
      errors[key] = `עד ${MAX_LEN} תווים`;
      continue;
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      errors[key] = rule.message;
      continue;
    }
    // A closed set of values, for the fields the admin renders as a <select>. Rejecting an
    // unknown one matters more than it looks: the display falls back to a default for anything
    // it does not recognise, so a typo'd kind would render as a plain row AND take the card
    // that derives from it down with it, silently.
    if (rule.values && !rule.values.includes(value)) {
      errors[key] = 'ערך לא תקין';
      continue;
    }
    fields[key] = value;
  }

  if (Object.keys(errors).length) return { errors };

  // A write that carries no doc clears any doc the item already had. Without this,
  // Object.assign in updateItem would leave the old rich content in place while `text`
  // said something else — and every renderer prefers `doc`.
  if (panel === 'announcements') fields.doc = null;

  return { fields };
}

// The five שבת rows the gabbai may pin to a fixed time. Blank means "leave it
// automatic" — the display computes that row from the zmanim instead.
const SHABBAT_SETTING_KEYS = ['candles', 'kabbalat', 'shacharit', 'mincha', 'arvit'];

// Deliberately NOT expressed through PANELS/validateItem. That machinery is built around
// `required`, whose whole job is to reject a blank — and here a blank is the single most
// important valid value there is, because clearing a field is how an override is removed.
// Bending validateItem to accept it would weaken the rule the four content panels rely on.
//
// Returns { settings } or { errors }, never both. Every key is present in the output
// whether or not the body carried it, so a partial PUT cannot leave the stored record
// half-shaped, and unknown keys are dropped rather than persisted.
function validateSettings(body) {
  const source = (body && typeof body.shabbat === 'object' && body.shabbat) || {};
  const shabbat = {};
  const errors = {};

  for (const key of SHABBAT_SETTING_KEYS) {
    const raw = source[key];
    const value = typeof raw === 'string' ? raw.trim() : '';

    if (!value) {
      shabbat[key] = '';
      continue;
    }
    if (!TIME_RE.test(value)) {
      errors[key] = 'שעה חייבת להיות בפורמט 18:00';
      continue;
    }
    shabbat[key] = value;
  }

  return Object.keys(errors).length ? { errors } : { settings: { shabbat } };
}

module.exports = {
  PANEL_KEYS,
  isPanel,
  validateItem,
  validateSettings,
  SHABBAT_SETTING_KEYS,
  MAX_ITEMS,
};
