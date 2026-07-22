const { randomUUID } = require('node:crypto');
const { contentStore, NotFoundError } = require('../store/contentStore');
const { isPanel, validateItem, MAX_ITEMS } = require('../store/panels');

// One controller for all four panels — they differ only in their fields, and
// store/panels.js already describes that difference.

// A mutator throws this to abort a create once a panel is already at MAX_ITEMS; the
// controller maps it to a 400, same as any other validation failure.
class ItemLimitError extends Error {}

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
    next(err);
  }
};

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
  res.json(updated);
});

const deleteItem = handler(async (req, res) => {
  const { panel, id } = req.params;

  await contentStore.update((draft) => {
    const index = draft[panel].findIndex((it) => it.id === id);
    if (index === -1) throw new NotFoundError(id);
    draft[panel].splice(index, 1);
  });
  res.json({ message: 'הפריט נמחק' });
});

module.exports = { getContent, getPanel, createItem, updateItem, deleteItem };
