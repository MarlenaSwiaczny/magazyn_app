const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const app = express();
app.use(express.json());
app.use('/api/auth', require('../routes/authUser'));

const prisma = new PrismaClient();

describe('POST /api/auth/change-password', () => {
  let user;
  beforeAll(async () => {
    // Tworzymy testowego użytkownika
    const hash = await bcrypt.hash('starehaslo123', 10);
    user = await prisma.user.create({
      data: {
        email: 'testuser@example.com',
        password: hash,
        name: 'Test User',
        role: 'user',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  it('zmienia hasło przy poprawnych danych', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ id: user.id, oldPassword: 'starehaslo123', newPassword: 'nowehaslo456' });
    expect(res.body.success).toBe(true);
    // Sprawdź czy hasło faktycznie się zmieniło
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    const match = await bcrypt.compare('nowehaslo456', updated.password);
    expect(match).toBe(true);
  });

  it('odrzuca zmianę przy złym starym haśle', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ id: user.id, oldPassword: 'zlehaslo', newPassword: 'nowehaslo456' });
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/stare hasło/i);
  });

  it('odrzuca zbyt krótkie nowe hasło', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ id: user.id, oldPassword: 'nowehaslo456', newPassword: '123' });
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/min. 6 znaków/i);
  });
});
