const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const sharp = require('sharp');
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const products = await prisma.product.findMany({ where: { imageUrl: { not: null }, imageThumb: null } });
    console.log(`Found ${products.length} products needing thumbnails`);

    for (const p of products) {
      try {
        const imageUrl = p.imageUrl;
        let buffer = null;
        if (!imageUrl) continue;
        if (imageUrl.startsWith('http')) {
          // fetch remote
          const fetch = require('node-fetch');
          const resp = await fetch(imageUrl);
          if (!resp.ok) {
            console.warn(`Skipping product ${p.id}, failed to fetch ${imageUrl}: ${resp.status}`);
            continue;
          }
          buffer = await resp.buffer();
        } else if (imageUrl.startsWith('/uploads/')) {
          const filename = imageUrl.replace('/uploads/', '');
          const fp = path.join(uploadDir, filename);
          if (!fs.existsSync(fp)) {
            console.warn(`Skipping product ${p.id}, file not found: ${fp}`);
            continue;
          }
          buffer = fs.readFileSync(fp);
        } else {
          console.warn(`Skipping product ${p.id}, unsupported imageUrl: ${imageUrl}`);
          continue;
        }

        const thumbName = `thumb_${Date.now()}_${p.id}.jpg`;
        const thumbPath = path.join(uploadDir, thumbName);
        await sharp(buffer).resize({ width: 400, height: 400, fit: 'inside' }).jpeg({ quality: 80 }).toFile(thumbPath);
  // Store relative thumb path so clients can resolve using their configured API base
  const thumbUrl = `/uploads/${thumbName}`;
  await prisma.product.update({ where: { id: p.id }, data: { imageThumb: thumbUrl } });
  console.log(`Generated thumb for product ${p.id} -> ${thumbUrl}`);
      } catch (e) {
        console.error(`Error processing product ${p.id}:`, e.message || e);
      }
    }

    console.log('Done');
    process.exit(0);
  } catch (e) {
    console.error('Script failed:', e.message || e);
    process.exit(1);
  }
})();
