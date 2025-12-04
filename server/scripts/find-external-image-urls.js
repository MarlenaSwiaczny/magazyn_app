const { PrismaClient } = require('@prisma/client');
(async function(){
  const prisma = new PrismaClient();
  try {
    const products = await prisma.product.findMany({ select: { id: true, name: true, imageUrl: true, imageThumb: true } });
    const external = products.filter(p => {
      const iu = p.imageUrl && typeof p.imageUrl === 'string' && p.imageUrl.trim().toLowerCase().startsWith('http');
      const it = p.imageThumb && typeof p.imageThumb === 'string' && p.imageThumb.trim().toLowerCase().startsWith('http');
      return iu || it;
    });
    console.log(`Found ${external.length} products with absolute imageUrl/imageThumb:`);
    for (const p of external) {
      console.log(JSON.stringify({ id: p.id, name: p.name, imageUrl: p.imageUrl, imageThumb: p.imageThumb }, null, 2));
    }
  } catch (e) {
    console.error('Error:', e && e.message ? e.message : e);
  } finally {
    await prisma.$disconnect();
  }
})();
