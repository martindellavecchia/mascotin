import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'negocio';
}

async function uniqueSlug(name) {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;
  while (await db.store.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

async function main() {
  const fallbackCategory = await db.storeCategory.upsert({
    where: { name: 'Otros' },
    update: { isActive: true },
    create: { name: 'Otros', description: 'Otros productos y servicios para mascotas' },
  });
  const providers = await db.providerProfile.findMany({
    include: { user: { select: { id: true, stores: { orderBy: { createdAt: 'asc' }, take: 1 } } } },
  });

  let created = 0;
  let linkedServices = 0;
  for (const provider of providers) {
    let store = provider.user.stores[0];
    if (!store) {
      store = await db.store.create({
        data: {
          categoryId: fallbackCategory.id,
          providerId: provider.userId,
          name: provider.businessName,
          slug: await uniqueSlug(provider.businessName),
          description: provider.description,
          address: provider.location,
        },
      });
      created += 1;
    }
    const result = await db.service.updateMany({
      where: { providerId: provider.id, storeId: null },
      data: { storeId: store.id },
    });
    linkedServices += result.count;
  }
  console.log(JSON.stringify({ providers: providers.length, created, linkedServices }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
