const express = require('express');
const {
  getContent,
  getPanel,
  createItem,
  updateItem,
  deleteItem,
} = require('../controllers/contentController');

const router = express.Router();

// No auth by design — access to the admin is by unlisted path. See the spec's
// "On the absence of auth"; this must be revisited before the server is ever
// reachable from outside the synagogue LAN.
router.get('/', getContent);
router.get('/:panel', getPanel);
router.post('/:panel', createItem);
router.put('/:panel/:id', updateItem);
router.delete('/:panel/:id', deleteItem);

module.exports = router;
