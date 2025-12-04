const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

(async function(){
  const prisma = new PrismaClient();
  try {
    const products = await prisma.product.findMany({ where: { imageUrl: { contains: 'trycloudflare.com' } } });
    console.log(`Found ${products.length} products with external trycloudflare imageUrl`);
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
    for (const p of products) {
      try {
        const url = p.imageUrl || '';
        let pathname = null;
        try { pathname = new URL(url).pathname; } catch (e) { console.warn('Invalid url for product', p.id, url); continue; }
        if (!pathname.startsWith('/uploads/')) { console.warn('Skipping product', p.id, 'non-uploads path', pathname); continue; }
        const filename = pathname.replace('/uploads/', '');
        const fullPath = path.join(uploadDir, filename);
        const thumbName = 'thumb_' + filename;
        const thumbPath = path.join(uploadDir, thumbName);
        const updates = {};
        if (fs.existsSync(fullPath)) {
          updates.imageUrl = pathname; // set relative path
        }
        if (fs.existsSync(thumbPath)) {
          updates.imageThumb = `/uploads/${thumbName}`;
        }
        if (Object.keys(updates).length === 0) {
          console.warn('No local files found for product', p.id, filename);
          continue;
        }
        await prisma.product.update({ where: { id: p.id }, data: updates });
        console.log('Updated product', p.id, '->', updates);
      } catch (e) {
        console.error('Error processing product', p.id, e && e.message ? e.message : e);
      }
    }
  } catch (e) {
    console.error('Script failed', e && e.message ? e.message : e);
  } finally {
    await prisma.$disconnect();
  }
})();
