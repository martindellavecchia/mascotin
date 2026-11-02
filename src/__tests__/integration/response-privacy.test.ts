import { randomUUID } from 'node:crypto';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { GET as getAdoption } from '@/app/api/adoptions/[id]/route';
import { GET as listAdoptions } from '@/app/api/adoptions/route';
import { GET as listGroupMembers } from '@/app/api/groups/[id]/members/route';
import { GET as listMatches } from '@/app/api/matches/route';
import { GET as getPassport } from '@/app/api/pet/[id]/passport/route';
import { GET as getPet } from '@/app/api/pet/[id]/route';
import { GET as listDiscovery } from '@/app/api/pets/route';
import { GET as listTrending } from '@/app/api/pets/trending/route';
import { GET as listComments } from '@/app/api/posts/[id]/comments/route';
import { GET as listSightings } from '@/app/api/posts/[id]/sightings/route';
import { GET as listLostPets } from '@/app/api/posts/lost/route';
import { getMessagesBootstrapData } from '@/lib/server/messages';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  RATE_LIMITS: {},
}));

const database = new URL(process.env.DATABASE_URL || 'https://invalid');
if (!['localhost', '127.0.0.1'].includes(database.hostname) || !database.pathname.startsWith('/product_')) {
  throw new Error('Response privacy tests require an isolated local product_ database');
}

const FORBIDDEN_FIELDS = new Set([
  'password',
  'email',
  'phone',
  'contactPhone',
  'emergencyToken',
  'microchipId',
  'allergies',
  'vetClinicName',
  'latitude',
  'longitude',
  'sharePhoneOnScan',
  'shareVetOnScan',
  'userId',
  'ownerId',
  'listedByUserId',
]);

function forbiddenFieldsIn(value: unknown, allowed: string[] = [], path = '$'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => forbiddenFieldsIn(item, allowed, `${path}[${index}]`));
  }
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = `${path}.${key}`;
    const found = FORBIDDEN_FIELDS.has(key) && !allowed.includes(key) ? [childPath] : [];
    return [...found, ...forbiddenFieldsIn(child, allowed, childPath)];
  });
}

const prefix = 'privacy-' + randomUUID();
const viewerId = `${prefix}-viewer`;
const otherId = `${prefix}-other`;
const blockedId = `${prefix}-blocked`;
const hiddenId = `${prefix}-hidden`;
const fosterId = `${prefix}-foster`;
const groupId = `${prefix}-group`;
const secrets = {
  phone: '+5491100000001',
  token: `${prefix}-token`,
  microchip: '985112000000001',
  allergies: 'alergia-privada',
  vet: 'veterinaria-privada',
  address: 'Thames 1234, Palermo, CABA',
};
const pets: Record<string, string> = {};
let adoptionId = '';
let lostPostId = '';

const session = (id: string) => (getServerSession as jest.Mock).mockResolvedValue({ user: { id } });
const request = (path = '/') => new Request(`http://localhost${path}`);
const idParams = (id: string) => ({ params: Promise.resolve({ id }) });

async function createOwnerWithPet(userId: string, name: string, extra: Record<string, unknown> = {}) {
  const owner = await db.owner.create({
    data: {
      userId,
      name,
      phone: secrets.phone,
      location: secrets.address,
      latitude: -34.58,
      longitude: -58.42,
    },
  });
  const pet = await db.pet.create({
    data: {
      ownerId: owner.id,
      name,
      petType: 'dog',
      size: 'medium',
      age: 3,
      gender: 'female',
      energy: 'medium',
      bio: 'Bio pública',
      activities: '[]',
      images: '[]',
      location: secrets.address,
      latitude: -34.58,
      longitude: -58.42,
      emergencyToken: `${secrets.token}-${name}`,
      microchipId: secrets.microchip,
      allergies: secrets.allergies,
      vetClinicName: secrets.vet,
      totalMatches: 1000,
      ...extra,
    },
  });
  pets[name] = pet.id;
  return pet;
}

beforeAll(async () => {
  await db.user.createMany({
    data: [viewerId, otherId, blockedId, hiddenId, fosterId].map((id) => ({
      id,
      name: id,
      email: `${id}@example.test`,
      password: 'hash-que-no-debe-salir',
    })),
  });
  await db.userSettings.create({ data: { userId: hiddenId, profileVisible: false } });
  await db.blockedUser.create({ data: { blockerId: blockedId, blockedId: viewerId } });

  await createOwnerWithPet(viewerId, 'propia');
  await createOwnerWithPet(otherId, 'ajena');
  await createOwnerWithPet(blockedId, 'bloqueada');
  await createOwnerWithPet(hiddenId, 'oculta');
  await createOwnerWithPet(fosterId, 'transito', { careRole: 'FOSTER', location: 'Palermo, CABA' });

  await db.match.createMany({
    data: [
      { pet1Id: pets.propia, pet2Id: pets.ajena },
      { pet1Id: pets.propia, pet2Id: pets.bloqueada },
    ],
  });
  const listing = await db.adoptionListing.create({
    data: {
      petId: pets.ajena,
      listedByUserId: otherId,
      character: 'Tranquila',
      location: 'Palermo, CABA',
      latitude: -34.58,
      longitude: -58.42,
    },
  });
  adoptionId = listing.id;

  const lostPost = await db.post.create({
    data: {
      authorId: otherId,
      postType: 'lost_pet',
      content: 'Se perdió',
      images: '[]',
      contactPhone: secrets.phone,
      lastSeenLocation: 'Palermo',
      latitude: -34.58,
      longitude: -58.42,
    },
  });
  lostPostId = lostPost.id;
  await db.post.create({
    data: { authorId: otherId, postType: 'lost_pet', content: 'Oculta', images: '[]', isVisible: false },
  });
  await db.comment.create({ data: { postId: lostPostId, authorId: otherId, content: 'Comentario' } });
  await db.petSighting.create({
    data: { postId: lostPostId, reporterId: fosterId, notes: 'La vi', latitude: -34.58, longitude: -58.42 },
  });
  await db.group.create({
    data: {
      id: groupId,
      creatorId: viewerId,
      name: 'Grupo QA',
      description: 'Grupo de prueba',
      members: { createMany: { data: [{ userId: viewerId, role: 'ADMIN' }, { userId: otherId }] } },
    },
  });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.$disconnect();
});

beforeEach(() => session(viewerId));

describe('respuestas a otros usuarios', () => {
  const cases: Array<[string, () => Promise<Response>]> = [
    ['GET /api/pet/[id]', () => getPet(request(), idParams(pets.ajena))],
    ['GET /api/pet/[id]/passport', () => getPassport(request(), idParams(pets.ajena))],
    ['GET /api/pets', () => listDiscovery(request(`/api/pets?currentPetId=${pets.propia}`))],
    ['GET /api/pets/trending', () => listTrending()],
    ['GET /api/matches', () => listMatches(request('/api/matches'))],
    ['GET /api/adoptions', () => listAdoptions(request('/api/adoptions'))],
    ['GET /api/adoptions/[id]', () => getAdoption(request(), idParams(adoptionId))],
    ['GET /api/posts/lost', () => listLostPets(request('/api/posts/lost'))],
    ['GET /api/posts/[id]/comments', () => listComments(request(), { params: { id: lostPostId } })],
    ['GET /api/posts/[id]/sightings', () => listSightings(request(), idParams(lostPostId))],
    ['GET /api/groups/[id]/members', () => listGroupMembers(request(), { params: { id: groupId } })],
  ];

  it.each(cases)('%s no incluye campos privados', async (_name, call) => {
    const response = await call();
    const body = await response.json();
    const raw = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(forbiddenFieldsIn(body)).toEqual([]);
    expect(raw).not.toContain(secrets.phone);
    expect(raw).not.toContain(secrets.token);
    expect(raw).not.toContain(secrets.microchip);
    expect(raw).not.toContain(secrets.allergies);
    expect(raw).not.toContain(secrets.vet);
    expect(raw).not.toContain('Thames 1234');
    expect(raw).not.toContain('hash-que-no-debe-salir');
  });

  it('el arranque de mensajes no incluye campos privados', async () => {
    const data = await getMessagesBootstrapData(viewerId);

    expect(data.matches.length).toBeGreaterThan(0);
    expect(forbiddenFieldsIn(data)).toEqual([]);
    expect(JSON.stringify(data)).not.toContain(secrets.phone);
  });
});

describe('quien puede ver cada dato', () => {
  it('el dueño conserva sus datos privados en el pasaporte', async () => {
    const body = await (await getPassport(request(), idParams(pets.propia))).json();

    expect(body.pet.isOwner).toBe(true);
    expect(body.pet.emergencyToken).toBe(`${secrets.token}-propia`);
    expect(body.pet.microchipId).toBe(secrets.microchip);
    expect(body.pet.allergies).toBe(secrets.allergies);
    expect(forbiddenFieldsIn(body, ['emergencyToken', 'microchipId', 'allergies', 'vetClinicName', 'latitude', 'longitude', 'sharePhoneOnScan', 'shareVetOnScan', 'ownerId'])).toEqual([]);
  });

  it('un bloqueo oculta la mascota y la coincidencia', async () => {
    expect((await getPet(request(), idParams(pets.bloqueada))).status).toBe(404);
    expect((await getPassport(request(), idParams(pets.bloqueada))).status).toBe(404);

    const matches = await (await listMatches(request('/api/matches'))).json();
    expect(matches.matches.map((pet: { id: string }) => pet.id)).toEqual([pets.ajena]);

    const trending = await (await listTrending()).json();
    expect(trending.pets.map((pet: { id: string }) => pet.id)).not.toContain(pets.bloqueada);

    const bootstrap = await getMessagesBootstrapData(viewerId);
    expect(bootstrap.matches.map((pet) => pet.id)).toEqual([pets.ajena]);
  });

  it('un perfil oculto no se puede consultar por id', async () => {
    expect((await getPet(request(), idParams(pets.oculta))).status).toBe(404);
    expect((await getPassport(request(), idParams(pets.oculta))).status).toBe(404);
  });

  it('una mascota en tránsito no revela a su responsable', async () => {
    const body = await (await getPet(request(), idParams(pets.transito))).json();

    expect(body.pet.owner).toEqual({ name: 'Hogar de tránsito', location: 'Palermo, CABA', image: null });
  });

  it('la ficha de adopción indica si es propia sin exponer ids', async () => {
    const foreign = await (await getAdoption(request(), idParams(adoptionId))).json();
    expect(foreign.listing.isOwner).toBe(false);

    session(otherId);
    const own = await (await getAdoption(request(), idParams(adoptionId))).json();
    expect(own.listing.isOwner).toBe(true);
  });

  it('las coordenadas del avistamiento solo llegan a quien publicó la alerta o lo reportó', async () => {
    session(otherId);
    const author = await (await listSightings(request(), idParams(lostPostId))).json();
    expect(author.sightings[0].latitude).toBe(-34.58);

    session(fosterId);
    const reporter = await (await listSightings(request(), idParams(lostPostId))).json();
    expect(reporter.sightings[0].reporterId).toBe(fosterId);

    session(viewerId);
    const other = await (await listSightings(request(), idParams(lostPostId))).json();
    expect(other.sightings[0]).not.toHaveProperty('latitude');
    expect(other.sightings[0]).not.toHaveProperty('reporterId');
  });
});

describe('alertas', () => {
  const ownIds = (lostPets: Array<{ id: string; author: { id: string } }>) =>
    lostPets.filter((post) => post.author.id === otherId).map((post) => post.id);

  it('oculta las publicaciones no visibles', async () => {
    const body = await (await listLostPets(request('/api/posts/lost'))).json();

    expect(ownIds(body.lostPets)).toEqual([lostPostId]);
  });

  it.each([['100000', 50], ['abc', 20], ['-1', 20], ['5', 5]])('limita limit=%s a %i', async (limit, expected) => {
    const spy = jest.spyOn(db.post, 'findMany');
    await listLostPets(request(`/api/posts/lost?limit=${limit}`));

    expect(spy.mock.calls[0][0]?.take).toBe(expected);
    spy.mockRestore();
  });

  it.each<[string, () => Promise<Response>]>([
    ['posts/lost', () => listLostPets(request('/api/posts/lost'))],
    ['comments', () => listComments(request(), { params: { id: lostPostId } })],
    ['sightings', () => listSightings(request(), idParams(lostPostId))],
  ])('%s exige sesión', async (_name, call) => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    expect((await call()).status).toBe(401);
  });
});
