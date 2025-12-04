const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
// const { authMiddleware } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/products-db?warehouseId=1
// router.get("/", authMiddleware, async (req, res) => {
router.get("/", async (req, res) => {
  try {
    const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : null;

    // Fetch products and their stocks (if any). We include products even when they have no stock rows.
    const products = await prisma.product.findMany({
      include: {
        stocks: {
          where: warehouseId ? { warehouseId } : {},
          include: { warehouse: true },
        },
        typeRel: true,
      },
    });

    // Build a result list: one entry per stock row; if a product has no stocks, include one entry with availableQty = 0
    const result = [];
    for (const p of products) {
      const typeName = (p.typeRel && p.typeRel.name) || p.type;
      if (p.stocks && p.stocks.length > 0) {
        for (const s of p.stocks) {
          result.push({
            id: p.id,
            name: p.name,
            size: p.size,
            type: typeName,
            availableQty: s.quantity || 0,
            warehouseId: s.warehouseId,
            warehouse: s.warehouse?.name || null,
            imageThumb: p.imageThumb || null,
            imageUrl: p.imageUrl || null,
          });
        }
      } else {
        // no stock rows -> include product as unavailable (no warehouse)
        result.push({
          id: p.id,
          name: p.name,
          size: p.size,
          type: typeName,
          availableQty: 0,
          warehouseId: null,
          warehouse: null,
          imageThumb: p.imageThumb || null,
          imageUrl: p.imageUrl || null,
        });
      }
    }

    result.sort((a, b) => {
      // typ
      if ((a.type || "") < (b.type || "")) return -1;
      if ((a.type || "") > (b.type || "")) return 1;
      // nazwa
      if ((a.name || "") < (b.name || "")) return -1;
      if ((a.name || "") > (b.name || "")) return 1;
      // rozmiar jako liczba
      const extractNumber = (str) => {
        if (!str) return NaN;
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : NaN;
      };
      const numA = extractNumber(a.size);
      const numB = extractNumber(b.size);
      if (isNaN(numA) && isNaN(numB)) return 0;
      if (isNaN(numA)) return 1;
      if (isNaN(numB)) return -1;
      return numA - numB;
    });

    res.json({ products: result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Błąd pobierania produktów z bazy" });
  }
});

module.exports = router;