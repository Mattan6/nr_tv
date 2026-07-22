// The four editable panels. Every panel is a list of items carrying an id and an
// isActive flag; they differ only in their text fields. Describing that difference
// as data — rather than as four sets of near-identical handlers — is what lets one
// controller and one pair of React screens serve all four.
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_LEN = 300;

const PANELS = {
  announcements: {
    text: { required: true },
  },
  shiurim: {
    name: { required: true },
    time: { required: true, pattern: TIME_RE, message: 'שעה חייבת להיות בפורמט 06:45' },
    by: { required: true },
  },
  mazal: {
    names: { required: true },
    occasion: { required: true },
  },
  azkarot: {
    name: { required: true },
    detail: { required: false },
    date: { required: true },
  },
};

const PANEL_KEYS = Object.keys(PANELS);

// hasOwnProperty, not `panel in PANELS`: otherwise 'constructor' and 'toString'
// would read as valid panel names.
const isPanel = (panel) => Object.prototype.hasOwnProperty.call(PANELS, panel);

// Returns { fields } or { errors }, never both. `fields` contains only schema keys,
// so a client cannot inject an id, an isActive, or anything else by sending it.
function validateItem(panel, body) {
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
    fields[key] = value;
  }

  return Object.keys(errors).length ? { errors } : { fields };
}

module.exports = { PANEL_KEYS, isPanel, validateItem };
