const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware } = require('../middleware/auth');

// POST /api/products/delete
// Expect JSON body: { productId }
// Authentication is required; user identity is taken from the token (req.user)
router.post('/', authMiddleware, async (req, res) => {
  const { productId } = req.body || {};
  // Prefer authenticated user id from middleware; fall back to userId in payload if present
  const authUserId = req.user && (req.user.id || req.user.userId || req.user.user_id) ? (req.user.id || req.user.userId || req.user.user_id) : null;
  const providedUserId = req.body && req.body.userId ? Number(req.body.userId) : null;
  const userId = authUserId || providedUserId || null;
  const id = Number(productId);
  if (!id) return res.status(400).json({ error: 'Missing productId' });
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Fetch current stocks for logging
    const stocks = await prisma.stock.findMany({ where: { productId: id } });

    // Delete related records that reference product to avoid FK constraint errors.
    // Perform in a transaction and remove dependent rows first.
    await prisma.$transaction(async (tx) => {
      // remove stock change records (referencing product)
      await tx.stockChange.deleteMany({ where: { productId: id } });
      // remove transfers, cart items and archives that reference product
      await tx.transfer.deleteMany({ where: { productId: id } });
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.archive.deleteMany({ where: { productId: id } });
      // remove stock rows
      await tx.stock.deleteMany({ where: { productId: id } });
      // finally remove the product
      await tx.product.delete({ where: { id } });
    });

    console.log('[API DELETE PRODUCT] deleted product', id, 'stocksRemoved=', stocks.length, 'byUser=', userId);
    return res.json({ success: true, removedStocks: stocks.length });
  } catch (err) {
    console.error('[API DELETE PRODUCT] Error deleting product', id, err && err.message);
    return res.status(500).json({ error: err && err.message ? String(err.message) : 'Server error' });
  }
});

module.exports = router;
