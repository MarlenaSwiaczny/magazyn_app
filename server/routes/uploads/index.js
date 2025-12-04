const express = require('express');
const router = express.Router();

// Consolidate upload endpoints. Preserve existing /api/upload POST behavior
// by mounting the legacy upload handler at '/'. If there are image-specific
// handlers (uploadImages.js), expose them under '/images' to avoid path
// collisions.

router.use('/', require('../upload'));
router.use('/images', require('../uploadImages'));

module.exports = router;
