// DEPRECATED: moved to `server/_deprecated/uploadImages.js`.
// This wrapper returns 410 to indicate deprecation; the main upload path is
// `POST /api/upload` handled by `server/routes/upload.js`.
const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  res.status(410).json({ error: 'This endpoint is deprecated. Use POST /api/upload instead.' });
});

module.exports = router;
