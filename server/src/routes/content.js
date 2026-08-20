const express = require('express');
const {
  getContent,
  getPanel,
  createItem,
  updateItem,
  deleteItem,
  reorderPanel,
  getSettings,
  updateSettings,
} = require('../controllers/contentController');

const router = express.Router();

// No auth by design — access to the admin is by unlisted path. See the spec's
// "On the absence of auth"; this must be revisited before the server is ever
// reachable from outside the synagogue LAN.
// Declared BEFORE '/:panel'. Express matches in declaration order, and a request for
// /settings that reached getPanel would answer 404 — 'settings' is a single record, not
// a panel, so isPanel rejects it. Moving these two lines below is a silent breakage.
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

router.get('/', getContent);
router.get('/:panel', getPanel);
router.post('/:panel', createItem);
// Declared BEFORE '/:panel/:id', and for exactly the reason the /settings pair above is
// declared before '/:panel'. Express matches in declaration order, so a
// PUT /content/roshDay1/order that reached updateItem would try to edit an item whose id is
// 'order' and answer 404. Moving this line below the next one is a silent breakage.
router.put('/:panel/order', reorderPanel);
router.put('/:panel/:id', updateItem);
router.delete('/:panel/:id', deleteItem);

module.exports = router;
