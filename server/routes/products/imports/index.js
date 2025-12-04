const express = require('express');
const router = express.Router();

// Aggregator for import-related product routes. These modules live at
// server/routes/*. We mount them here so the products router can include
// all import functionality from a single place while keeping legacy paths.

router.use('/', require('../../importProducts'));
router.use('/', require('../../importProductsAction'));
router.use('/', require('../../importProductsAdd'));
router.use('/', require('../../importProductsFull'));
router.use('/', require('../../importRow'));

module.exports = router;
