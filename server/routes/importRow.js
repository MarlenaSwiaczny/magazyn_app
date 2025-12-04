const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/products/import-row
// body: { row, userId, options?, confirmAction? }
// confirmAction: 'increase' | 'reject' when duplicate encountered
router.post('/import-row', async (req, res) => {
  try {
    // Removed transient diagnostic logs

    const { row, userId, options = {}, confirmAction } = req.body;
    if (!row || !userId) return res.status(400).json({ error: 'Missing data' });

    const name = (row.Nazwa || row.name || '').toString().trim();
    const size = (row.Rozmiar || row.size || '').toString().trim();
    const type = (row.Typ || row.type || '').toString().trim();
    const warehouseName = (row.Magazyn || row.warehouse || row.Lokalizacja || '').toString().trim();
    const quantity = Number(row.Ilość ?? row.quantity ?? 0) || 0;

    // Ensure product
    let product = await prisma.product.findFirst({ where: { name, size } });
    if (!product) {
      product = await prisma.product.create({ data: { name, size, type } });
    }

    // If no warehouse specified, only create product
    if (!warehouseName) {
      return res.json({ status: 'createdProductOnly', productId: product.id });
    }

    // Find or create warehouse if option allows
    let warehouse = await prisma.warehouse.findFirst({ where: { name: warehouseName } });
    if (!warehouse) {
      if (options.createWarehouses !== false) {
        warehouse = await prisma.warehouse.create({ data: { name: warehouseName } });
      } else {
        return res.status(400).json({ error: `Warehouse ${warehouseName} does not exist` });
      }
    }

    // Find stock for product in warehouse
    let stock = await prisma.stock.findFirst({ where: { productId: product.id, warehouseId: warehouse.id } });
    if (stock) {
      // Duplicate detected
      if (!confirmAction) {
        return res.json({ status: 'duplicate', product: { id: product.id, name: product.name }, warehouse: { id: warehouse.id, name: warehouse.name }, existingQty: stock.quantity, incomingQty: quantity });
      }
      if (confirmAction === 'increase') {
        const newQty = Number(stock.quantity) + Number(quantity);
        await prisma.stock.update({ where: { id: stock.id }, data: { quantity: newQty } });
        await prisma.stockChange.create({ data: { type: 'import', quantity: Number(quantity), productId: product.id, warehouseId: warehouse.id, userId: Number(userId) } });
        return res.json({ status: 'updated', quantity: newQty });
      }
      if (confirmAction === 'reject') {
        return res.json({ status: 'skipped' });
      }
    } else {
      // Create stock
      const created = await prisma.stock.create({ data: { productId: product.id, warehouseId: warehouse.id, quantity: Number(quantity) } });
      await prisma.stockChange.create({ data: { type: 'import', quantity: Number(quantity), productId: product.id, warehouseId: warehouse.id, userId: Number(userId) } });
      return res.json({ status: 'created', quantity: created.quantity });
    }
  } catch (e) {
    console.error('[API /api/products/import-row] Server error:', e);
    return res.status(500).json({ error: 'Row import error' });
  }
});

module.exports = router;
