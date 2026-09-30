import { randomUUID } from 'node:crypto';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { GET as discover } from '@/app/api/pets/route';
import { getSuggestionsForPet } from '@/lib/server/home';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const database = new URL(process.env.DATABASE_URL || 'https://invalid');
if (!['localhost', '127.0.0.1'].includes(database.hostname) || !database.pathname.startsWith('/product_')) {
  throw new Error('Discovery tests require an isolated local product_ database');
}
const prefix = 'six-discovery-' + randomUUID();
const users = ['viewer', 'dog', 'cat', 'hidden', 'paused', 'blocked', 'far', 'inactive'].map((name) => prefix + '-' + name);
let mine: Awaited<ReturnType<typeof db.pet.create>>;
let dogId: string;
let catId: string;

beforeAll(async () => {
  await db.user.createMany({ data: users.map((id) => ({ id, email: id + '@example.test' })) });
  for (const [index, userId] of users.entries()) {
    const owner = await db.owner.create({ data: { userId, name: userId, location: 'Buenos Aires', latitude: -34.6, longitude: -58.4 } });
    const pet = await db.pet.create({ data: {
      ownerId: owner.id, name: index === 2 ? 'Mishi' : userId, petType: index === 2 ? 'cat' : 'dog',
      breed: null, size: 'medium', age: 2, gender: 'female', energy: 'medium', bio: '', activities: '[]',
      images: '[]', location: 'Buenos Aires', latitude: index === 6 ? -31 : -34.6, longitude: -58.4,
      isActive: index !== 7,
    } });
    if (index === 0) mine = pet;
    if (index === 1) dogId = pet.id;
    if (index === 2) catId = pet.id;
    await db.userSettings.create({ data: { userId, profileVisible: index !== 3, matchingPaused: index === 4, matchDistance: 50 } });
  }
  await db.blockedUser.create({ data: { blockerId: users[5], blockedId: users[0] } });
});

beforeEach(async () => {
  (getServerSession as jest.Mock).mockResolvedValue({ user: { id: users[0] } });
  await db.userSettings.update({ where: { userId: users[0] }, data: { matchPetTypes: '[]', matchPetSizes: '[]', matchingPaused: false } });
  await db.swipe.deleteMany({ where: { fromPetId: mine.id } });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});

async function compare() {
  const response = await discover(new Request(`http://localhost/api/pets?currentPetId=${mine.id}`));
  expect(response.status).toBe(200);
  const body = await response.json();
  const suggestions = await getSuggestionsForPet(users[0], mine, 'Buenos Aires', '', [mine.id], 6, { latitude: -34.6, longitude: -58.4 });
  expect(suggestions.map((pet) => pet.id)).toEqual(body.pets.slice(0, 6).map((pet: { id: string }) => pet.id));
  return body.pets as Array<{ id: string }>;
}

it('does not recommend Mishi to a dog when default discovery only includes dogs', async () => {
  expect((await compare()).map((pet) => pet.id)).toEqual([dogId]);
});

it('shares explicit species and size preferences between home and discovery', async () => {
  await db.userSettings.update({ where: { userId: users[0] }, data: { matchPetTypes: '["cat"]' } });
  expect((await compare()).map((pet) => pet.id)).toEqual([catId]);
  await db.userSettings.update({ where: { userId: users[0] }, data: { matchPetSizes: '["large"]' } });
  expect(await compare()).toEqual([]);
});

it('removes a swiped candidate and returns it after undo without exposing private, blocked or distant pets', async () => {
  const swipe = await db.swipe.create({ data: { fromPetId: mine.id, toPetId: dogId, isLike: false } });
  expect(await compare()).toEqual([]);
  await db.swipe.update({ where: { id: swipe.id }, data: { undoneAt: new Date() } });
  expect((await compare()).map((pet) => pet.id)).toEqual([dogId]);
});

it('keeps browsing consistent when the viewer pauses their own visibility', async () => {
  await db.userSettings.update({ where: { userId: users[0] }, data: { matchingPaused: true } });
  expect((await compare()).map((pet) => pet.id)).toEqual([dogId]);
});

it('still rejects discovery for someone else’s pet', async () => {
  const response = await discover(new Request(`http://localhost/api/pets?currentPetId=${dogId}`));
  expect(response.status).toBe(403);
});
