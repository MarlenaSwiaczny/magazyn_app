// DEPRECATED: This module duplicates functionality of `POST /api/products` in
// server/routes/products.js. Kept for backward-compatibility; consider
// consolidating into `products.js` and removing this file after client
// migration.
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
// const { authMiddleware } = require('../middleware/auth');

// POST /api/products/add
// Protect add product with authMiddleware so we record req.user.id for stock changes
const { authMiddleware } = require('../middleware/auth');
router.post("/add", authMiddleware, async (req, res) => {
  try {
  const { name, size, type, typeId, warehouseId, warehouseName, quantity, userId, imageUrl, imageThumb, createWarehouses } = req.body;
    if (!name || !size || ((!type && !typeId)) || (!warehouseId && !warehouseName) || !quantity || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    // Capitalize first letter for name, type, warehouse
    const capitalizeFirst = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
    const capitalizedName = capitalizeFirst(name);
  const capitalizedType = type ? capitalizeFirst(type) : null;
  const capitalizedWarehouse = capitalizeFirst(warehouseName || '');
    // Check if product already exists (unique: name, size, type)
    // Try to find product by name/size and typeId (if provided) or by type string
    let product = null;
    if (typeId) {
      product = await prisma.product.findFirst({ where: { name: capitalizedName, size: size, typeId: Number(typeId) } });
    }
    if (!product) {
      product = await prisma.product.findFirst({ where: { name: capitalizedName, size: size, type: capitalizedType } });
    }
    if (!product) {
      // If not exists, create product
      const data = {
        name: capitalizedName,
        type: capitalizedType || undefined,
        size: size,
        imageUrl: imageUrl || null,
        imageThumb: imageThumb || null,
      };
      if (typeId) data.typeId = Number(typeId);
      product = await prisma.product.create({ data });
    } else {
      // If incoming image values provided, update product image fields
      const updateData = {};
      if (imageUrl !== undefined && product.imageUrl !== imageUrl) updateData.imageUrl = imageUrl;
      if (imageThumb !== undefined && product.imageThumb !== imageThumb) updateData.imageThumb = imageThumb;
      if (Object.keys(updateData).length > 0) {
        product = await prisma.product.update({ where: { id: product.id }, data: updateData });
      }
    }
    // Resolve warehouse: prefer id, otherwise find by name. Do NOT create
    // warehouses from client-supplied names — the UI must select an existing
    // warehouse from the dropdown.
    let warehouseRecord = null;
    if (warehouseId) {
      warehouseRecord = await prisma.warehouse.findUnique({ where: { id: Number(warehouseId) } });
      if (!warehouseRecord) return res.status(400).json({ error: 'Warehouse id not found', received: warehouseId });
    } else {
      warehouseRecord = await prisma.warehouse.findFirst({ where: { name: capitalizedWarehouse } });
      if (!warehouseRecord) {
        return res.status(400).json({ error: 'Warehouse not found. Please choose an existing warehouse.' });
      }
    }
    // Check if stock already exists for this product and warehouse
    const existingStock = await prisma.stock.findFirst({
      where: {
        productId: product.id,
        warehouseId: warehouseRecord.id
      }
    });
    if (existingStock) {
      // If stock exists, increase quantity
      const updatedStock = await prisma.stock.update({
        where: { id: existingStock.id },
        data: { quantity: existingStock.quantity + Number(quantity) }
      });
      // Save change in StockChange
      await prisma.stockChange.create({
        data: {
          type: "add",
          quantity: Number(quantity),
          productId: product.id,
          warehouseId: warehouseRecord.id,
          userId: Number(userId)
        }
      });
      return res.json({ success: true, product, stock: updatedStock });
    }
    // Add stock if not exists
    await prisma.stock.create({ data: { productId: product.id, warehouseId: warehouseRecord.id, quantity: Number(quantity) } });

    // Resolve user id (prefer authenticated user if present)
    const uid = Number((req.user && req.user.id) ? req.user.id : userId);
    if (!uid || Number.isNaN(uid)) return res.status(400).json({ error: 'Missing or invalid userId for stock change' });
    const userExists = await prisma.user.findUnique({ where: { id: uid } });
    if (!userExists) return res.status(400).json({ error: `User not found for id ${uid}` });

    // Save change in StockChange
    await prisma.stockChange.create({ data: { type: "add", quantity: Number(quantity), productId: product.id, warehouseId: warehouseRecord.id, userId: uid } });

    res.json({ success: true, product });
  } catch (e) {
    console.error('[ADD PRODUCT] Error:', e);
    res.status(500).json({ error: "Błąd dodawania produktu" });
  }
});

module.exports = router;
