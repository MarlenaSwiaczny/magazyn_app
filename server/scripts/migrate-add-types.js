// Run this script AFTER running `prisma migrate` that adds the Type model and product.typeId field.
// It will create Type rows for each unique product.type and set product.typeId accordingly.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  try {
  console.log('[MIGRATE] Fetching distinct product types...');
  // fetch all and filter in JS to avoid Prisma 'not: null' validation issues across versions
  const rows = await prisma.product.findMany({ select: { id: true, type: true } });
    const typeMap = {};
    for (const r of rows) {
      const name = (r.type || '').toString().trim();
      if (!name) continue;
      if (!typeMap[name]) typeMap[name] = [];
      typeMap[name].push(r.id);
    }

    const names = Object.keys(typeMap);
    console.log('[MIGRATE] Found types:', names);
    for (const name of names) {
      const trimmed = name;
      // ensure type exists
      let t = await prisma.type.findUnique({ where: { name: trimmed } });
      if (!t) {
        t = await prisma.type.create({ data: { name: trimmed } });
        console.log('[MIGRATE] Created type', t.name, t.id);
      }
      // update products referencing this string type -> set typeId
      const ids = typeMap[name];
      await prisma.product.updateMany({ where: { id: { in: ids } }, data: { typeId: t.id } });
      console.log('[MIGRATE] Updated products count', ids.length, '-> typeId', t.id);
    }

    console.log('[MIGRATE] Migration finished successfully. Review the DB and consider removing the legacy `type` string field in a follow-up migration.');
  } catch (err) {
    console.error('[MIGRATE] Error during migration', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
