const { randomUUID } = require('node:crypto');
const { contentStore, NotFoundError } = require('../store/contentStore');
const { isPanel, validateItem, validateSettings, MAX_ITEMS } = require('../store/panels');
const { sweepOrphans } = require('../store/uploads');

// One controller for all four panels — they differ only in their fields, and
// store/panels.js already describes that difference.

// A mutator throws this to abort a create once a panel is already at MAX_ITEMS; the
// controller maps it to a 400, same as any other validation failure.
class ItemLimitError extends Error {}

// A mutator throws this when the posted id list is not a permutation of the panel's current
// items; the controller maps it to a 400, same as any other validation failure.
class ReorderError extends Error {}

// Wraps a handler so panel validation, NotFoundError and unexpected failures are
// handled once instead of five times.
const handler = (fn) => async (req, res, next) => {
  if (req.params.panel !== undefined && !isPanel(req.params.panel)) {
    return res.status(404).json({ message: 'פאנל לא קיים' });
  }
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ message: 'הפריט לא נמצא' });
    }
    if (err instanceof ItemLimitError) {
      return res.status(400).json({ message: `אי אפשר להוסיף יותר מ-${MAX_ITEMS} פריטים בפאנל זה` });
    }
    if (err instanceof ReorderError) {
      return res.status(400).json({ message: 'סדר לא תקין' });
    }
    next(err);
  }
};

// Runs after a successful write — on any panel rather than only on announcements, which
// is one code path instead of a condition to get wrong, over a directory holding tens of
// files. Awaited rather than fired and forgotten so it is deterministic under test, and
// wrapped so a stale file can never turn a saved announcement into a 500.
async function sweep() {
  try {
    await sweepOrphans(await contentStore.read());
  } catch (err) {
    console.error(`⚠️  Could not sweep orphaned uploads: ${err.message}`);
  }
}

const getContent = handler(async (req, res) => {
  res.json(await contentStore.read());
});

const getPanel = handler(async (req, res) => {
  const doc = await contentStore.read();
  res.json(doc[req.params.panel]);
});

const createItem = handler(async (req, res) => {
  const { panel } = req.params;
  const { fields, errors } = validateItem(panel, req.body);
  if (errors) return res.status(400).json({ message: 'שדות לא תקינים', errors });

  const created = await contentStore.update((draft) => {
    if (draft[panel].length >= MAX_ITEMS) throw new ItemLimitError(panel);
    const item = { id: randomUUID(), ...fields, isActive: true };
    draft[panel].push(item);
    return item;
  });
  await sweep();
  res.status(201).json(created);
});

const updateItem = handler(async (req, res) => {
  const { panel, id } = req.params;
  const { fields, errors } = validateItem(panel, req.body);
  if (errors) return res.status(400).json({ message: 'שדות לא תקינים', errors });

  const updated = await contentStore.update((draft) => {
    const item = draft[panel].find((it) => it.id === id);
    if (!item) throw new NotFoundError(id);
    Object.assign(item, fields);
    // A PUT replaces the text fields; isActive changes only when explicitly sent,
    // which is how the list screen's הצג/הסתר switch saves.
    if (typeof req.body.isActive === 'boolean') item.isActive = req.body.isActive;
    return item;
  });
  await sweep();
  res.json(updated);
});

const deleteItem = handler(async (req, res) => {
  const { panel, id } = req.params;

  await contentStore.update((draft) => {
    const index = draft[panel].findIndex((it) => it.id === id);
    if (index === -1) throw new NotFoundError(id);
    draft[panel].splice(index, 1);
  });
  await sweep();
  res.json({ message: 'הפריט נמחק' });
});

// The שבת time overrides: one record rather than a list, so it has its own pair of
// handlers instead of going through the panel routes above. `handler` still wraps them —
// its panel check is skipped because these routes carry no :panel param.

// Reorders a panel by posting its ids in the order they should be stored.
//
// The whole list, rather than "move item X up one". Two admin tabs open on one phone is an
// ordinary thing to happen, and a positional patch computed against a list one of them has
// not seen can drop or duplicate a row silently. A permutation either describes the list the
// server actually holds or it does not — and if it does not, nothing is written at all.
//
// Order is the panel's own data here, not a field on an item: it is what the display renders
// in, and for the ראש השנה day lists it is the order of the davening.
const reorderPanel = handler(async (req, res) => {
  const { panel } = req.params;
  const ids = req.body == null ? undefined : req.body.ids;
  if (!Array.isArray(ids)) return res.status(400).json({ message: 'רשימת מזהים חסרה' });

  const reordered = await contentStore.update((draft) => {
    const current = draft[panel];
    if (ids.length !== current.length) throw new ReorderError();

    const remaining = new Map(current.map((it) => [it.id, it]));
    const next = [];
    for (const id of ids) {
      const item = remaining.get(id);
      if (!item) throw new ReorderError();
      // Consumed as we go, so a repeated id fails on its second visit rather than quietly
      // cloning one row over a dropped one.
      remaining.delete(id);
      next.push(item);
    }

    draft[panel] = next;
    return next;
  });

  res.json(reordered);
});

const getSettings = handler(async (req, res) => {
  const doc = await contentStore.read();
  res.json(doc.settings);
});

// A PUT replaces whole GROUPS, not the whole record.
//
// Within a group validateSettings always returns every key, so a body that omits one clears
// it rather than leaving a stale override behind — which is what makes "empty the field to go
// back to automatic" work from the form. But it returns only the groups the body named, and
// they are spread over what is stored rather than assigned: there is a times screen per board
// now, each posting its own group, and a save on one must never blank another's.
const updateSettings = handler(async (req, res) => {
  const { settings, errors } = validateSettings(req.body);
  if (errors) return res.status(400).json({ message: 'שדות לא תקינים', errors });

  const saved = await contentStore.update((draft) => {
    draft.settings = { ...draft.settings, ...settings };
    return draft.settings;
  });
  res.json(saved);
});

module.exports = {
  getContent,
  getPanel,
  createItem,
  updateItem,
  deleteItem,
  reorderPanel,
  getSettings,
  updateSettings,
};
