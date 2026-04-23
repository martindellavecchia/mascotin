import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MascotT-In pets seed...');

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'maria@example.com' },
      update: {},
      create: {
        email: 'maria@example.com',
        name: 'María González',
      },
    }),
    prisma.user.upsert({
      where: { email: 'carlos@example.com' },
      update: {},
      create: {
        email: 'carlos@example.com',
        name: 'Carlos Rodríguez',
      },
    }),
    prisma.user.upsert({
      where: { email: 'ana@example.com' },
      update: {},
      create: {
        email: 'ana@example.com',
        name: 'Ana Martínez',
      },
    }),
  ]);

  console.log(`✅ Created/Updated ${users.length} users`);

  const owners = await Promise.all([
    prisma.owner.upsert({
      where: { userId: users[0].id },
      update: {},
      create: {
        userId: users[0].id,
        name: 'María González',
        phone: '+54 9 11 1234 5678',
        location: 'Buenos Aires, Argentina',
        bio: 'Amante de los perros, tengo un patio grande para jugar.',
        hasYard: true,
        hasOtherPets: true,
      },
    }),
    prisma.owner.upsert({
      where: { userId: users[1].id },
      update: {},
      create: {
        userId: users[1].id,
        name: 'Carlos Rodríguez',
        phone: '+54 9 11 2345 6789',
        location: 'Buenos Aires, Argentina',
        bio: 'Entrenador profesional de perros.',
        hasYard: true,
        hasOtherPets: false,
      },
    }),
    prisma.owner.upsert({
      where: { userId: users[2].id },
      update: {},
      create: {
        userId: users[2].id,
        name: 'Ana Martínez',
        phone: '+54 9 11 3456 7890',
        location: 'Buenos Aires, Argentina',
        bio: 'Amante de los gatos y pájaros.',
        hasYard: false,
        hasOtherPets: true,
      },
    }),
  ]);

  console.log(`✅ Created/Updated ${owners.length} owners`);

  const pets = await Promise.all([
    prisma.pet.upsert({
      where: { ownerId_name: { ownerId: owners[0].id, name: 'Max' } },
      update: {},
      create: {
        ownerId: owners[0].id,
        name: 'Max',
        petType: 'dog',
        breed: 'Golden Retriever',
        age: 3,
        size: 'large',
        gender: 'male',
        vaccinated: true,
        neutered: true,
        energy: 'high',
        bio: 'Max es un Golden Retriever muy juguetón. Ama el fetch y nadar en el parque.',
        activities: JSON.stringify(['play', 'fetch', 'swim', 'walk']),
        location: 'Buenos Aires, Argentina',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800',
          'https://images.unsplash.com/photo-1591769225440-811ad7d6eca5?w=800',
        ]),
        level: 5,
        xp: 450,
        totalMatches: 12,
        isActive: true,
      },
    }),
    prisma.pet.upsert({
      where: { ownerId_name: { ownerId: owners[1].id, name: 'Luna' } },
      update: {},
      create: {
        ownerId: owners[1].id,
        name: 'Luna',
        petType: 'dog',
        breed: 'Labrador',
        age: 2,
        size: 'large',
        gender: 'female',
        vaccinated: true,
        neutered: true,
        energy: 'medium',
        bio: 'Luna es una Labrador muy tranquila y cariñosa.',
        activities: JSON.stringify(['walk', 'socialize']),
        location: 'Buenos Aires, Argentina',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800',
        ]),
        level: 3,
        xp: 250,
        totalMatches: 6,
        isActive: true,
      },
    }),
    prisma.pet.upsert({
      where: { ownerId_name: { ownerId: owners[2].id, name: 'Mishi' } },
      update: {},
      create: {
        ownerId: owners[2].id,
        name: 'Mishi',
        petType: 'cat',
        breed: 'Siamese',
        age: 4,
        size: 'small',
        gender: 'female',
        vaccinated: true,
        neutered: true,
        energy: 'low',
        bio: 'Mishi es una gatita Siamese muy tranquila. Le gusta dormir y mirar por la ventana.',
        activities: JSON.stringify(['groom', 'socialize']),
        location: 'Buenos Aires, Argentina',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1513245543132-31f507417b26?w=800',
        ]),
        level: 2,
        xp: 150,
        totalMatches: 4,
        isActive: true,
      },
    }),
    prisma.pet.upsert({
      where: { ownerId_name: { ownerId: owners[0].id, name: 'Rocky' } },
      update: {},
      create: {
        ownerId: owners[0].id,
        name: 'Rocky',
        petType: 'dog',
        breed: 'Bulldog',
        age: 4,
        size: 'medium',
        gender: 'male',
        vaccinated: true,
        neutered: false,
        energy: 'medium',
        bio: 'Rocky es un Bulldog amigable y le encanta dormir.',
        activities: JSON.stringify(['walk', 'play']),
        location: 'Buenos Aires, Argentina',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800',
        ]),
        level: 4,
        xp: 320,
        totalMatches: 8,
        isActive: true,
      },
    }),
    prisma.pet.upsert({
      where: { ownerId_name: { ownerId: owners[1].id, name: 'Coco' } },
      update: {},
      create: {
        ownerId: owners[1].id,
        name: 'Coco',
        petType: 'bird',
        breed: 'Canario',
        age: 2,
        size: 'small',
        gender: 'male',
        vaccinated: true,
        neutered: false,
        energy: 'high',
        bio: 'Coco es un canario que canta muy bonito.',
        activities: JSON.stringify(['socialize', 'play']),
        location: 'Buenos Aires, Argentina',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1552728089-57bdde30beb1?w=800',
        ]),
        level: 2,
        xp: 80,
        totalMatches: 3,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created/Updated ${pets.length} pets`);

  console.log('🎉 Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - Users: ${users.length}`);
  console.log(`  - Owners: ${owners.length}`);
  console.log(`  - Pets: ${pets.length}`);
  console.log('\n🐾 Ready to test MascotT-In!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
