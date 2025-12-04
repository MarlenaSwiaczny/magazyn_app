const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

(async () => {
  try {
    console.log('Starting normalization of image URLs...', dryRun ? '(dry-run)' : '');
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { imageUrl: { contains: 'uploads/' } },
          { imageThumb: { contains: 'uploads/' } }
        ]
      }
    });

    console.log(`Found ${products.length} products with upload-like URLs`);
    let changed = 0;
    const applied = [];

    for (const p of products) {
      const updates = {};
      if (p.imageUrl && typeof p.imageUrl === 'string') {
        const m = p.imageUrl.match(/\/uploads\/(.+)$/);
        if (m && m[1]) {
          const rel = `/uploads/${m[1]}`;
          if (rel !== p.imageUrl) {
            updates.imageUrl = rel;
          }
        }
      }
      if (p.imageThumb && typeof p.imageThumb === 'string') {
        const m = p.imageThumb.match(/\/uploads\/(.+)$/);
        if (m && m[1]) {
          const rel = `/uploads/${m[1]}`;
          if (rel !== p.imageThumb) {
            updates.imageThumb = rel;
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        applied.push({ id: p.id, before: { imageUrl: p.imageUrl, imageThumb: p.imageThumb }, after: updates });
        if (!dryRun) {
          await prisma.product.update({ where: { id: p.id }, data: updates });
        }
        changed++;
        console.log(`Will update product ${p.id}:`, updates);
      }
    }

    if (!dryRun && applied.length > 0) {
      const outDir = path.join(__dirname, 'backups');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const outFile = path.join(outDir, `normalize-changes-${Date.now()}.json`);
      fs.writeFileSync(outFile, JSON.stringify(applied, null, 2), 'utf8');
      console.log('Wrote backup to', outFile);
    }

    console.log(`Done. ${dryRun ? 'Would update' : 'Updated'} ${changed} products.`);
    process.exit(0);
  } catch (e) {
    console.error('Normalizer failed:', e.message || e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
