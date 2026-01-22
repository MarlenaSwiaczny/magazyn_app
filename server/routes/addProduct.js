// DEPRECATED: moved to `server/_deprecated/addProduct.js`.
// This file stays as a lightweight deprecation wrapper to avoid breaking
// older deployments referencing `/api/products/add`.
const express = require('express');
const router = express.Router();

router.post('/add', (req, res) => {
  res.status(410).json({ error: 'This endpoint is deprecated. Use POST /api/products instead.' });
});

module.exports = router;
