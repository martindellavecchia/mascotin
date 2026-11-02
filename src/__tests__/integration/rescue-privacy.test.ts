import { randomUUID } from 'node:crypto';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { POST as confirmPlacement } from '@/app/api/foster/placements/[id]/confirm/route';
import { PUT as publishCase } from '@/app/api/rescue-cases/[id]/publication/route';
import { PATCH as updateRadius } from '@/app/api/rescue-cases/[id]/radius/route';
import { GET as getCase } from '@/app/api/rescue-cases/[id]/route';
import { GET as listCases, POST as createCase } from '@/app/api/rescue-cases/route';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const database = new URL(process.env.DATABASE_URL || 'https://invalid');
if (!['localhost', '127.0.0.1'].includes(database.hostname) || !database.pathname.startsWith('/product_')) {
  throw new Error('Rescue privacy tests require an isolated local product_ database');
}

const prefix = 'rescue-privacy-' + randomUUID();
const creatorId = `${prefix}-creator`;
const pendingFosterId = `${prefix}-pending`;
const interestedFosterId = `${prefix}-interested`;
const volunteerId = `${prefix}-volunteer`;
const limitedId = `${prefix}-limited`;
const PRECISE_DISTANCE = 4.37;
const session = (id: string) => (getServerSession as jest.Mock).mockResolvedValue({ user: { id } });
const request = () => new Request('http://localhost/api/test');
const jsonRequest = (body: unknown) =>
  new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
let caseId = '';
let placementId = '';
let pendingOfferId = '';
let interestedOfferId = '';

async function createFoster(userId: string) {
  return db.fosterProfile.create({
    data: {
      userId,
      location: 'Thames 1234, Palermo, CABA',
      latitude: -34.58,
      longitude: -58.42,
      housingType: 'house',
      hasKids: true,
      hasOtherPets: true,
      experience: 'some',
      notes: 'nota-privada-del-hogar',
      adultDeclaredAt: new Date(),
      termsAcceptedAt: new Date(),
      termsVersion: 'qa',
    },
  });
}

const offerData = (fosterProfileId: string, status: 'PENDING' | 'INTERESTED') => ({
  rescueCaseId: caseId,
  fosterProfileId,
  status,
  distanceKm: PRECISE_DISTANCE,
  score: 67,
  reasons: JSON.stringify(['4.4 km de distancia', 'Acepta perros']),
  expiresAt: new Date(Date.now() + 86400000),
});

beforeAll(async () => {
  await db.user.createMany({
    data: [creatorId, pendingFosterId, interestedFosterId, volunteerId, limitedId].map((id) => ({
      id,
      name: id,
      email: `${id}@example.test`,
    })),
  });
  const rescueCase = await db.rescueCase.create({
    data: {
      createdByUserId: creatorId,
      species: 'dog',
      size: 'medium',
      urgency: 'HIGH',
      apparentCondition: 'Bien',
      description: 'Caso de prueba',
      images: '[]',
      location: 'Palermo, CABA',
      latitude: -34.6,
      longitude: -58.4,
      searchRadiusKm: 10,
      requestedDays: 7,
      consentAcceptedAt: new Date(),
      consentVersion: 'qa',
      needs: { create: { type: 'FOSTER', isPrimary: true, status: 'INTERESTED' } },
    },
    include: { needs: true },
  });
  caseId = rescueCase.id;
  const pendingProfile = await createFoster(pendingFosterId);
  const interestedProfile = await createFoster(interestedFosterId);
  const pendingOffer = await db.fosterOffer.create({ data: offerData(pendingProfile.id, 'PENDING') });
  const interestedOffer = await db.fosterOffer.create({ data: offerData(interestedProfile.id, 'INTERESTED') });
  pendingOfferId = pendingOffer.id;
  interestedOfferId = interestedOffer.id;
  const placement = await db.fosterPlacement.create({
    data: {
      rescueCaseId: caseId,
      offerId: interestedOffer.id,
      fosterProfileId: interestedProfile.id,
      status: 'ACTIVE',
    },
  });
  placementId = placement.id;
  await db.rescueCaseEvent.create({
    data: {
      caseId,
      actorId: interestedFosterId,
      type: 'FOSTER_INTERESTED',
      payload: { distanceKm: PRECISE_DISTANCE, score: 67 },
    },
  });
  const volunteerProfile = await db.volunteerProfile.create({
    data: {
      userId: volunteerId,
      roles: '[]',
      location: 'Palermo, CABA',
      latitude: -34.58,
      longitude: -58.42,
      adultDeclaredAt: new Date(),
      termsAcceptedAt: new Date(),
      termsVersion: 'qa',
    },
  });
  await db.volunteerOffer.create({
    data: {
      needId: rescueCase.needs[0].id,
      volunteerProfileId: volunteerProfile.id,
      role: 'TRANSPORT',
      distanceKm: PRECISE_DISTANCE,
      score: 67,
      reasons: JSON.stringify(['4.4 km de distancia']),
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
});

afterAll(async () => {
  await db.rateLimitBucket.deleteMany({ where: { key: { contains: prefix } } });
  await db.user.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.$disconnect();
});

describe('ofertas vistas por quien creó el caso', () => {
  it('no incluye datos del hogar hasta que responde', async () => {
    session(creatorId);
    const body = await (await getCase(request(), { params: Promise.resolve({ id: caseId }) })).json();
    const offers: Array<Record<string, unknown>> = body.case.offers;
    const pending = offers.find((offer) => offer.id === pendingOfferId)!;
    const interested = offers.find((offer) => offer.id === interestedOfferId)!;

    expect(pending).not.toHaveProperty('fosterProfile');
    expect(pending).not.toHaveProperty('reasons');
    expect(interested.fosterProfile).toMatchObject({ housingType: 'house', location: 'Palermo, CABA' });
    expect(body.case.volunteerOffers[0]).not.toHaveProperty('volunteer');
  });

  it('solo informa rangos de distancia', async () => {
    session(creatorId);
    const body = await (await getCase(request(), { params: Promise.resolve({ id: caseId }) })).json();
    const raw = JSON.stringify(body);

    expect(body.case.offers[0].distanceRangeKm).toBe(5);
    expect(body.case.offers[0]).not.toHaveProperty('score');
    expect(body.case.volunteerOffers[0].distanceRangeKm).toBe(5);
    expect(raw).not.toContain(String(PRECISE_DISTANCE));
    expect(raw).not.toContain('distanceKm');
    expect(raw).not.toContain('4.4 km');
    expect(raw).not.toContain('Thames 1234');
  });
});

describe('ofertas vistas por el hogar', () => {
  it('recibe rango, puntaje redondeado y motivos sin distancia precisa', async () => {
    session(pendingFosterId);
    const body = await (await listCases()).json();
    const offer = body.offers.find((row: { id: string }) => row.id === pendingOfferId);

    expect(offer.distanceRangeKm).toBe(5);
    expect(offer.score).toBe(70);
    expect(offer.reasons).toEqual(['Hasta 5 km de distancia', 'Acepta perros']);
    expect(offer).not.toHaveProperty('distanceKm');
  });
});

describe('POST /api/foster/placements/[id]/confirm', () => {
  it('no devuelve coordenadas ni datos del hogar', async () => {
    session(creatorId);
    const response = await confirmPlacement(request(), { params: Promise.resolve({ id: placementId }) });
    const body = await response.json();
    const raw = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.placement.status).toBe('ACTIVE');
    expect(raw).not.toContain('latitude');
    expect(raw).not.toContain('longitude');
    expect(raw).not.toContain('fosterProfile"');
    expect(raw).not.toContain('nota-privada-del-hogar');
  });
});

describe('límites compartidos', () => {
  it('corta la creación de casos al superar el tope por hora', async () => {
    session(limitedId);
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      statuses.push((await createCase(jsonRequest({}))).status);
    }

    expect(statuses.slice(0, 5)).toEqual([400, 400, 400, 400, 400]);
    expect(statuses[5]).toBe(429);
    await db.rateLimitBucket.deleteMany({ where: { key: `rescue-case-create:${limitedId}` } });
  });

  it('corta los cambios de radio y publicación con el mismo tope', async () => {
    session(limitedId);
    const params = { params: Promise.resolve({ id: caseId }) };
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      statuses.push((await updateRadius(jsonRequest({ searchRadiusKm: 0 }), params)).status);
      statuses.push((await publishCase(jsonRequest({}), params)).status);
    }
    const blocked = await updateRadius(jsonRequest({ searchRadiusKm: 0 }), params);

    expect(statuses.every((status) => status === 400)).toBe(true);
    expect(blocked.status).toBe(429);
    await db.rateLimitBucket.deleteMany({ where: { key: `rescue-case-update:${limitedId}` } });
  });
});
