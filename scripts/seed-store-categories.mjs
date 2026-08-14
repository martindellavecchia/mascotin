import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const categories = [
  ['Veterinaria', 'Consultas, prevención y atención veterinaria.'],
  ['Peluquería y grooming', 'Baño, corte y cuidado estético.'],
  ['Paseos y cuidadores', 'Paseos, visitas y cuidado personalizado.'],
  ['Guardería y hotel', 'Alojamiento y cuidado por día o noche.'],
  ['Alimentos y tienda', 'Alimentos, accesorios y productos para mascotas.'],
  ['Entrenamiento', 'Educación, conducta y entrenamiento.'],
  ['Otros', 'Otros servicios para mascotas.'],
];

try {
  for (const [name, description] of categories) {
    await db.storeCategory.upsert({
      where: { name },
      update: { description, isActive: true },
      create: { name, description },
    });
  }

  console.log(`Seeded ${categories.length} store categories.`);
} finally {
  await db.$disconnect();
}
