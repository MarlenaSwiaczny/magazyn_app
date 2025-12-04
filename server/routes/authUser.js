const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { signJwt } = require('../utils/jwt');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const prisma = new PrismaClient();

// POST /api/auth/get-user
// Protect this endpoint with token-based auth: it will return the user based on the JWT payload
router.post("/get-user", authMiddleware, async (req, res) => {
  // Token validated by authMiddleware; use req.user from token
  try {
    const id = req.user && req.user.id;
    if (!id) return res.status(400).json({ success: false, error: "Brak ID użytkownika w tokenie" });
    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) return res.status(404).json({ success: false, error: "Nie znaleziono użytkownika" });
    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl, userWarehouse: user.userWarehouse } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Błąd pobierania użytkownika" });
  }
});
// POST /api/auth/register
router.post(
  "/register",
  [
    check('email').isEmail().withMessage('Niepoprawny email'),
    check('password').isLength({ min: 6 }).withMessage('Hasło musi mieć min. 6 znaków')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { email, password, name } = req.body;
    try {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        return res.status(200).json({ success: false, error: "Email już istnieje" });
      }
      const hash = await bcrypt.hash(password, 10);
      const defaultName = name || email.split('@')[0];
      const userCount = await prisma.user.count();
      const role = userCount === 0 ? "admin" : "basic";
      const user = await prisma.user.create({ data: { email, password: hash, name: defaultName, role } });
      res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl } });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, error: "Błąd rejestracji. Spróbuj ponownie." });
    }
  }
);

// POST /api/auth/update-profile
// POST /api/auth/update-profile - require authentication and only allow updating own profile (or admin)
router.post("/update-profile", authMiddleware, async (req, res) => {
  // prefer id from token to avoid users updating arbitrary accounts
  const tokenUserId = Number(req.user && req.user.id);
  const { id, name, avatarUrl, userWarehouse } = req.body;
  const targetId = id ? Number(id) : tokenUserId;
  if (!targetId) return res.status(400).json({ success: false, error: "Brak ID użytkownika" });

  // Only allow users to update their own profile unless they're admin
  if (tokenUserId !== targetId && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Brak uprawnień do edycji profilu' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: targetId },
      data: { name, avatarUrl, userWarehouse },
    });
    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl, userWarehouse: user.userWarehouse } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Błąd aktualizacji profilu" });
  }
});

// POST /api/auth/login
router.post(
  "/login",
  [
    check('email').isEmail().withMessage('Niepoprawny email'),
    check('password').notEmpty().withMessage('Podaj hasło')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(200).json({ success: false, error: "Nieprawidłowy email lub hasło" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(200).json({ success: false, error: "Nieprawidłowy email lub hasło" });
    }
    // JWT
    const token = signJwt({ id: user.id, email: user.email, role: user.role });
    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl, userWarehouse: user.userWarehouse } });
  } catch (e) {
    console.error(e);
    res.status(200).json({ success: false, error: "Błąd logowania. Spróbuj ponownie." });
  }
});

// POST /api/auth/change-password - require authentication and only allow changing own password (or admin)
router.post(
  "/change-password",
  authMiddleware,
  [
    check('oldPassword').notEmpty().withMessage('Stare hasło wymagane'),
    check('newPassword').isLength({ min: 6 }).withMessage('Nowe hasło musi mieć min. 6 znaków')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const tokenUserId = Number(req.user && req.user.id);
    const { id, oldPassword, newPassword } = req.body;
    const targetId = id ? Number(id) : tokenUserId;
  if (!targetId || !oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Brak wymaganych danych" });
  }

  // Only allow users to change their own password unless admin
  if (tokenUserId !== targetId && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Brak uprawnień do zmiany hasła' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: Number(targetId) } });
    if (!user) {
      return res.status(404).json({ success: false, message: "Nie znaleziono użytkownika" });
    }
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(200).json({ success: false, message: "Stare hasło jest nieprawidłowe" });
    }
    if (newPassword.length < 6) {
      return res.status(200).json({ success: false, message: "Nowe hasło musi mieć min. 6 znaków" });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: Number(targetId) },
      data: { password: hash },
    });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Błąd zmiany hasła" });
  }
});

// GET /api/auth/users - lista użytkowników (tylko dla admina)
router.get("/users", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        userWarehouse: true,
        createdAt: true
      }
    });
    res.json({ success: true, users });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Błąd pobierania użytkowników" });
  }
});

// POST /api/auth/update-role - zmiana roli użytkownika (tylko dla admina)
router.post("/update-role", authMiddleware, requireRole("admin"), async (req, res) => {
  const { id, role } = req.body;
  if (!id || !role) return res.status(400).json({ success: false, error: "Brak danych" });
  try {
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { role },
    });
    res.json({ success: true, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Błąd zmiany roli" });
  }
});

module.exports = router;
