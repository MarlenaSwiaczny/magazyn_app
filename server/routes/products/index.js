const express = require('express');
const router = express.Router();

// This file groups all product-related routers under a single mount point
// so the server can require one module instead of mounting many files.
// Each required file exports an express.Router() with its own internal paths
// (for example addProduct defines POST /add). We mount them here so the
// overall API surface remains unchanged (e.g. /api/products/add).

router.use('/', require('../products'));
router.use('/', require('../addProduct'));
router.use('/', require('../editProduct'));
// Group import-related routers under a single internal module to keep the
// products router tidy. The imports module re-exports the original files
// so endpoint paths remain unchanged (eg. /api/products/import).
// Mount import-related sub-routers (no transient startup logs)
router.use('/', require('./imports'));
// Keep delete endpoints as subpaths to preserve existing URLs
router.use('/delete', require('../deleteProduct'));
router.use('/delete-from-warehouse', require('../deleteFromWarehouse'));
// Also support RESTful DELETE /api/products/:id
router.use('/', require('./deleteById'));

module.exports = router;
