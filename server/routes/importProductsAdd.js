// DEPRECATED: helper for incremental import additions. Check client usage
// before removing. Consider consolidating with imports/index.js.
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// POST /api/products/import-add
// Accepts rows array and userId. Each row may use Polish or English field names.
router.post("/import-add", async (req, res) => {
  try {
    const { rows, userId } = req.body;
    if (!Array.isArray(rows) || !userId) {
      return res.status(400).json({ error: "Invalid data" });
    }
    for (const row of rows) {
      // Support both Polish and English column names
      const name = row.name || row.Nazwa;
      const size = row.size || row.Rozmiar || "";
      const type = row.type || row.Typ || "";
      const unit = row.unit || row.Jednostka || "";
      const warehouseName = row.warehouse || row.Magazyn;
      const quantity = row.quantity || row.Ilość || 0;

      // Find or create warehouse by name (only when provided)
      let warehouse = null;
      if (warehouseName) {
        warehouse = await prisma.warehouse.findFirst({ where: { name: warehouseName } });
        if (!warehouse) {
          warehouse = await prisma.warehouse.create({ data: { name: warehouseName } });
        }
      }

      // Find or create product by [name, size]
      let product = await prisma.product.findFirst({ where: { name, size } });
      if (!product) {
        product = await prisma.product.create({
          data: {
            name,
            size,
            type,
            unit
          }
        });
      }

      // Find stock for product in warehouse and update or create
      if (warehouse) {
        let stock = await prisma.stock.findFirst({ where: { productId: product.id, warehouseId: warehouse.id } });
        if (stock) {
          await prisma.stock.update({ where: { id: stock.id }, data: { quantity: stock.quantity + Number(quantity) } });
        } else {
          await prisma.stock.create({ data: { productId: product.id, warehouseId: warehouse.id, quantity: Number(quantity) } });
        }
        // Log to stockChange
        await prisma.stockChange.create({
          data: {
            type: "add",
            quantity: Number(quantity),
            productId: product.id,
            warehouseId: warehouse.id,
            userId: Number(userId)
          }
        });
      } else {
        // No warehouse provided -> only ensure product exists (no stock created)
      }
    }
    res.json({ success: true });
  } catch (e) {
    console.error('[API /api/products/import-add] Server error:', e);
    res.status(500).json({ error: "Product import error" });
  }
});

module.exports = router;
