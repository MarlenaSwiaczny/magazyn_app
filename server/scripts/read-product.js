const { PrismaClient } = require('@prisma/client');
(async function() {
  const prisma = new PrismaClient();
  try {
    const id = process.argv[2] ? Number(process.argv[2]) : null;
    if (!id) { console.error('Usage: node read-product.js <id>'); process.exit(1); }
    const p = await prisma.product.findUnique({ where: { id } });
    console.log(JSON.stringify(p, null, 2));
  } catch (e) {
    console.error('Error:', e && e.message ? e.message : e);
  } finally {
    await prisma.$disconnect();
  }
})();
