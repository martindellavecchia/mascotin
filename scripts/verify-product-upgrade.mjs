import { Client } from 'pg';
import { readdir, readFile } from 'node:fs/promises';

const source = new URL(process.env.DATABASE_URL || 'https://invalid');
if (!['localhost', '127.0.0.1'].includes(source.hostname) || !source.pathname.startsWith('/product_')) {
  throw new Error('La verificación requiere un PostgreSQL local y una base product_');
}
const database = `product_upgrade_${Date.now()}`;
const adminUrl = new URL(source);
adminUrl.pathname = '/postgres';
const admin = new Client({ connectionString: adminUrl.href });
await admin.connect();
try {
  await admin.query(`CREATE DATABASE "${database}" ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0`);
} finally {
  await admin.end();
}
const target = new URL(source);
target.pathname = `/${database}`;
const client = new Client({ connectionString: target.href });
await client.connect();
try {
  const root = new URL('../prisma/migrations/', import.meta.url);
  const migrations = (await readdir(root)).filter((name) => /^\d{14}_/.test(name)).sort();
  const firstNew = migrations.indexOf('20260911110000_product_intent');
  if (firstNew < 0) throw new Error('No se encontró la migración de producto');
  const apply = async (names) => {
    for (const name of names) {
      await client.query(await readFile(new URL(`${name}/migration.sql`, root), 'utf8'));
    }
  };
  await apply(migrations.slice(0, firstNew));
  await client.query(`
    INSERT INTO "User"(id,email,"updatedAt") VALUES ('old-user','upgrade@example.test',NOW()),('old-provider','provider-upgrade@example.test',NOW());
    INSERT INTO "Owner"(id,"userId",name,location,"updatedAt") VALUES ('old-owner','old-user','Test','Palermo',NOW());
    INSERT INTO "Pet"(id,"ownerId",name,"petType",age,size,gender,energy,bio,activities,location,images,"updatedAt") VALUES ('old-pet','old-owner','Old pet','dog',2,'medium','male','medium','','[]','Palermo','[]',NOW());
    INSERT INTO "ProviderProfile"(id,"userId","businessName",location,"updatedAt") VALUES ('old-provider-profile','old-provider','Test','Palermo',NOW());
    INSERT INTO "Service"(id,"providerId",name,description,price,duration,"updatedAt") VALUES ('old-service','old-provider-profile','Test','',100,90,NOW());
    INSERT INTO "Appointment"(id,"serviceId","userId","petId",date,status,"updatedAt") VALUES ('old-a','old-service','old-user','old-pet','2027-01-01 12:00:00','CONFIRMED',NOW()),('old-b','old-service','old-user','old-pet','2027-01-01 12:30:00','PENDING',NOW());
  `);
  const before = (await client.query('SELECT id,status,date FROM "Appointment" ORDER BY id')).rows;
  await apply(migrations.slice(firstNew));
  const after = (await client.query('SELECT id,status,date,"durationMinutes" FROM "Appointment" ORDER BY id')).rows;
  if (JSON.stringify(before) !== JSON.stringify(after.map(({ durationMinutes, ...row }) => row)) || after.some((row) => row.durationMinutes !== 90)) {
    throw new Error('La actualización cambió los turnos anteriores');
  }
  console.log(JSON.stringify({ database, migrations: migrations.length, appointmentsPreserved: after.length, overlappingLegacyAppointmentsPreserved: true, durationBackfill: 90, verifiedAt: new Date().toISOString() }));
} finally {
  await client.end();
}
