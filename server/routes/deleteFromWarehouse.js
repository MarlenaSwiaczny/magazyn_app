const express = require('express');
// DEPRECATED: remove stock from warehouse endpoint. I couldn't find direct
// client-side calls to this path; verify before removing permanently.
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Usuwa produkt z magazynu (nie z bazy) i loguje zmianę w stockChange
router.post('/', async (req, res) => {
  const { productId, warehouseId, quantity, userId } = req.body;
  if (!productId || !warehouseId || !quantity) {
    return res.status(400).json({ error: 'Brak wymaganych danych' });
  }
  try {
    // Usuń rekord stock (połączenie produkt-magazyn)
    await prisma.stock.deleteMany({
      where: { productId, warehouseId },
    });
    // Log do stockChange
    await prisma.stockChange.create({
      data: {
        productId,
        warehouseId,
        userId,
        type: 'delete',
        quantity: -quantity,
      },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
