import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { requestAppointment, changeAppointment } from '@/lib/server/bookings';
import { availableSlots, type BookingSchedule } from '@/lib/booking-schedule';
import { recordSwipe, undoPass } from '@/lib/server/swipes';
import { saveMeetup } from '@/lib/server/meetups';
import { digestForUser } from '@/lib/server/search-digest';
import { getInbox } from '@/lib/server/inbox';
import { createNotificationBulk } from '@/lib/notifications';
import { searchFiltersSchema } from '@/lib/product-search';
import { getServerSession } from 'next-auth';
import { GET as getAvailability } from '@/app/api/services/[id]/availability/route';
import { GET as getProviderAppointments } from '@/app/api/provider/appointments/route';
import { GET as getClientAppointments } from '@/app/api/appointments/route';
import { DELETE as deleteProvider } from '@/app/api/admin/providers/[id]/route';
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn(), RATE_LIMITS: {} }));
jest.mock('@/lib/server/push', () => ({ enqueueNotificationPush: jest.fn().mockResolvedValue(0) }));
const url = new URL(process.env.DATABASE_URL || 'https://invalid');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.startsWith('/product_'))
  throw new Error('Product integration tests require an isolated local product_ database');
const prefix = `product-${randomUUID()}`;
const ids = ['client', 'provider', 'friend', 'stranger'].map((name) => `${prefix}-${name}`);
const [client, providerUser, friend, stranger] = ids;
const featureFlags = [
  'PRODUCT_SAVED_SEARCHES_ENABLED',
  'PRODUCT_BOOKINGS_ENABLED',
  'PRODUCT_MEETUPS_ENABLED',
];
const originalFlags = featureFlags.map((key) => process.env[key]);
const schedule: BookingSchedule = {
  timeZone: 'America/Argentina/Buenos_Aires',
  weekly: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, start: '08:00', end: '20:00' })),
  exceptions: [],
};
let provider: string,
  service: string,
  longerService: string,
  pet: string,
  friendPet: string,
  strangerPet: string,
  matchId: string,
  category: string;
const future = () => availableSlots(schedule, 60, [], new Date(Date.now() + 86400000))[0];
beforeAll(async () => {
  featureFlags.forEach((key) => {
    process.env[key] = 'true';
  });
  await db.user.createMany({
    data: ids.map((id) => ({
      id,
      email: `${id}@example.test`,
      name: id,
      emailVerified: new Date(),
    })),
  });
  const p = await db.providerProfile.create({
    data: {
      userId: providerUser,
      businessName: 'Test provider',
      location: 'Buenos Aires',
      schedule,
    },
  });
  provider = p.id;
  service = (
    await db.service.create({
      data: { providerId: provider, name: 'Service 60', description: '', duration: 60, price: 100 },
    })
  ).id;
  longerService = (
    await db.service.create({
      data: { providerId: provider, name: 'Service 90', description: '', duration: 90, price: 150 },
    })
  ).id;
  const pets: string[] = [];
  for (const id of [client, friend, stranger]) {
    const owner = await db.owner.create({
      data: { userId: id, name: id, location: 'Buenos Aires' },
    });
    pets.push(
      (
        await db.pet.create({
          data: {
            ownerId: owner.id,
            name: 'Test pet',
            petType: 'dog',
            age: 2,
            size: 'medium',
            gender: 'male',
            energy: 'medium',
            bio: '',
            activities: '[]',
            images: '[]',
            location: 'Buenos Aires',
          },
        })
      ).id
    );
  }
  [pet, friendPet, strangerPet] = pets;
  category = (await db.storeCategory.create({ data: { name: prefix } })).id;
});
afterAll(async () => {
  featureFlags.forEach((key, index) => {
    if (originalFlags[index] === undefined) delete process.env[key];
    else process.env[key] = originalFlags[index];
  });
  await db.store.deleteMany({ where: { slug: { startsWith: prefix } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  if (category) await db.storeCategory.deleteMany({ where: { id: category } });
  await db.$disconnect();
});
describe('PostgreSQL product workflows', () => {
  it('offers overlapping replacement slots only to the owner of an active appointment', async () => {
    const date = future();
    const appointment = await requestAppointment(client, { serviceId: service, petId: pet, date });
    jest.mocked(getServerSession).mockResolvedValue({ user: { id: client } });
    const request = (id?: string) =>
      new Request(
        `http://localhost/api/services/${service}/availability${id ? `?appointmentId=${id}` : ''}`
      );
    const params = { params: Promise.resolve({ id: service }) };
    const candidate = new Date(new Date(date).getTime() + 15 * 60000).toISOString();
    expect((await (await getAvailability(request(), params)).json()).slots).not.toContain(
      candidate
    );
    expect((await (await getAvailability(request(appointment.id), params)).json()).slots).toContain(
      candidate
    );
    jest.mocked(getServerSession).mockResolvedValue({ user: { id: stranger } });
    expect((await getAvailability(request(appointment.id), params)).status).toBe(403);
    jest.mocked(getServerSession).mockResolvedValue(null);
    expect((await getAvailability(request(), params)).status).toBe(401);
    await changeAppointment(client, appointment.id, { status: 'CANCELLED' });
  });
  it('paginates historical appointments, counts past states and protects provider history from deletion', async () => {
    await db.appointment.createMany({
      data: Array.from({ length: 51 }, (_, n) => ({
        serviceId: service,
        userId: client,
        petId: pet,
        date: new Date(Date.now() - (n + 1) * 86400000),
        durationMinutes: 60,
        status: 'COMPLETED',
      })),
    });
    jest.mocked(getServerSession).mockResolvedValue({ user: { id: providerUser } });
    const first = await (
      await getProviderAppointments(
        new Request('http://localhost/api/provider/appointments?status=COMPLETED')
      )
    ).json();
    const second = await (
      await getProviderAppointments(
        new Request('http://localhost/api/provider/appointments?status=COMPLETED&page=2')
      )
    ).json();
    expect(first.appointments).toHaveLength(50);
    expect(first.hasMore).toBe(true);
    expect(first.counts.COMPLETED).toBe(51);
    expect(second.appointments).toHaveLength(1);
    expect(second.hasMore).toBe(false);
    expect(first.appointments.map((a: { id: string }) => a.id)).not.toContain(
      second.appointments[0].id
    );
    jest.mocked(getServerSession).mockResolvedValue({ user: { id: client } });
    const history = await (
      await getClientAppointments(new Request('http://localhost/api/appointments?all=true'))
    ).json();
    expect(history.appointments).toHaveLength(50);
    expect(history.hasMore).toBe(true);
    expect(
      (await deleteProvider(new Request('http://localhost'), { params: { id: provider } })).status
    ).toBe(403);
    await db.user.update({ where: { id: stranger }, data: { role: 'ADMIN' } });
    jest.mocked(getServerSession).mockResolvedValue({ user: { id: stranger } });
    expect(
      (await deleteProvider(new Request('http://localhost'), { params: { id: provider } })).status
    ).toBe(409);
    expect(
      await db.appointment.count({
        where: { service: { providerId: provider }, status: 'COMPLETED' },
      })
    ).toBe(51);
    expect(await db.providerProfile.findUnique({ where: { id: provider } })).not.toBeNull();
    await db.user.update({ where: { id: stranger }, data: { role: 'OWNER' } });
  });
  it('serializes two services sharing one provider and preserves the duration snapshot', async () => {
    const date = future();
    const result = await Promise.allSettled([
      requestAppointment(client, { serviceId: service, petId: pet, date }),
      requestAppointment(client, { serviceId: longerService, petId: pet, date }),
    ]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(result.filter((r) => r.status === 'rejected')).toHaveLength(1);
    const winner = result.find((r) => r.status === 'fulfilled') as PromiseFulfilledResult<
      Awaited<ReturnType<typeof requestAppointment>>
    >;
    const row = winner.value;
    await db.service.update({ where: { id: row.serviceId }, data: { duration: 15 } });
    expect(
      (await db.appointment.findUniqueOrThrow({ where: { id: row.id } })).durationMinutes
    ).toBe(row.durationMinutes);
    await expect(
      changeAppointment(stranger, row.id, { status: 'CONFIRMED' })
    ).rejects.toMatchObject({ status: 403 });
    await expect(changeAppointment(client, row.id, { status: 'CONFIRMED' })).rejects.toThrow();
    await changeAppointment(providerUser, row.id, { status: 'CONFIRMED' });
    await expect(
      changeAppointment(providerUser, row.id, { status: 'COMPLETED' })
    ).rejects.toThrow();
    await expect(
      changeAppointment(client, row.id, { date: new Date(Date.now() - 1000).toISOString() })
    ).rejects.toThrow();
    expect(
      (await db.appointment.findUniqueOrThrow({ where: { id: row.id } })).date.toISOString()
    ).toBe(date);
    await changeAppointment(client, row.id, { status: 'CANCELLED' });
    expect(await db.appointmentEvent.count({ where: { appointmentId: row.id } })).toBe(3);
    await expect(
      changeAppointment(providerUser, row.id, { status: 'CONFIRMED' })
    ).rejects.toThrow();
    await db.service.update({ where: { id: service }, data: { duration: 60 } });
    await db.service.update({ where: { id: longerService }, data: { duration: 90 } });
  });
  it('reschedules atomically and prevents an occupied destination from losing the original', async () => {
    const date = future();
    const a = await requestAppointment(client, { serviceId: service, petId: pet, date });
    const occupied = new Date(new Date(date).getTime() + 2 * 3600000).toISOString();
    const b = await requestAppointment(client, { serviceId: service, petId: pet, date: occupied });
    await expect(changeAppointment(client, a.id, { date: occupied })).rejects.toThrow();
    expect(
      (await db.appointment.findUniqueOrThrow({ where: { id: a.id } })).date.toISOString()
    ).toBe(date);
    const next = new Date(new Date(date).getTime() + 4 * 3600000).toISOString();
    await changeAppointment(providerUser, a.id, { status: 'CONFIRMED' });
    expect((await changeAppointment(client, a.id, { date: next })).status).toBe('PENDING');
    await changeAppointment(client, a.id, { status: 'CANCELLED' });
    await changeAppointment(client, b.id, { status: 'CANCELLED' });
  });
  it('rejects bookings before a provider configures availability or across blocked users', async () => {
    await db.providerProfile.update({
      where: { id: provider },
      data: { schedule: { ...schedule, weekly: [] } },
    });
    await expect(
      requestAppointment(client, { serviceId: service, petId: pet, date: future() })
    ).rejects.toThrow();
    await db.providerProfile.update({ where: { id: provider }, data: { schedule } });
    const block = await db.blockedUser.create({
      data: { blockerId: providerUser, blockedId: client },
    });
    await expect(
      requestAppointment(client, { serviceId: service, petId: pet, date: future() })
    ).rejects.toMatchObject({ status: 403 });
    await db.blockedUser.delete({ where: { id: block.id } });
  });
  it('undo only removes the last negative pass and never earns extra XP or undoes a match', async () => {
    await db.pet.update({ where: { id: pet }, data: { xp: 40 } });
    const first = await recordSwipe(client, pet, friendPet, false);
    await undoPass(client, pet, first.swipeId);
    const xp = (await db.pet.findUniqueOrThrow({ where: { id: pet } })).xp;
    const repeated = await recordSwipe(client, pet, friendPet, false);
    expect(repeated.xpGained).toBe(0);
    expect((await db.pet.findUniqueOrThrow({ where: { id: pet } })).xp).toBe(xp);
    await recordSwipe(client, pet, strangerPet, false);
    await expect(undoPass(client, pet, repeated.swipeId)).rejects.toThrow();
    await recordSwipe(client, pet, friendPet, true);
    expect((await recordSwipe(friend, friendPet, pet, true)).matched).toBe(true);
    const matchedPet = await db.pet.findUniqueOrThrow({ where: { id: pet } });
    expect(matchedPet.level).toBe(Math.floor(matchedPet.xp / 100) + 1);
    const match = await db.match.findFirstOrThrow({ where: { pet1Id: friendPet, pet2Id: pet } });
    matchId = match.id;
    const laterPass = await recordSwipe(client, pet, friendPet, false);
    await expect(undoPass(client, pet, laterPass.swipeId)).rejects.toThrow();
    expect(await db.match.count({ where: { id: matchId } })).toBe(1);
  });
  it('requires both participants to accept revised plans and rejects stale versions and outsiders', async () => {
    const proposal = {
      place: 'Parque público',
      date: future(),
      publicPlace: true,
      durationMinutes: 60,
    };
    const created = await saveMeetup(client, matchId, { action: 'PROPOSE', proposal });
    await expect(
      saveMeetup(stranger, matchId, { action: 'ACCEPT', id: created.id, version: created.version })
    ).rejects.toMatchObject({ status: 403 });
    const accepted = await saveMeetup(friend, matchId, {
      action: 'ACCEPT',
      id: created.id,
      version: created.version,
    });
    expect(accepted.status).toBe('ACCEPTED');
    const edited = await saveMeetup(client, matchId, {
      action: 'EDIT',
      id: created.id,
      version: accepted.version,
      proposal: { ...proposal, place: 'Otro parque público' },
    });
    expect(edited.status).toBe('PROPOSED');
    await expect(
      saveMeetup(friend, matchId, { action: 'ACCEPT', id: created.id, version: accepted.version })
    ).rejects.toThrow();
    const block = await db.blockedUser.create({ data: { blockerId: friend, blockedId: client } });
    await expect(
      saveMeetup(friend, matchId, { action: 'ACCEPT', id: created.id, version: edited.version })
    ).rejects.toMatchObject({ status: 403 });
    await db.blockedUser.delete({ where: { id: block.id } });
    await db.userSettings.upsert({
      where: { userId: friend },
      create: { userId: friend, notifyMatches: false },
      update: { notifyMatches: false },
    });
    const noticesBefore = await db.notification.count({
      where: { userId: friend, type: 'MEETUP' },
    });
    await saveMeetup(client, matchId, {
      action: 'CANCEL',
      id: created.id,
      version: edited.version,
    });
    expect(await db.notification.count({ where: { userId: friend, type: 'MEETUP' } })).toBe(
      noticesBefore
    );
  });
  it('deduplicates concurrent digests across searches and honors pause and filters', async () => {
    const cutoff = new Date();
    const start = new Date(cutoff.getTime() - 3600000);
    const filters = searchFiltersSchema.parse({ categoryId: category, zone: 'Palermo' });
    await db.savedSearch.createMany({
      data: [1, 2].map((n) => ({
        userId: client,
        name: `Services ${n}`,
        kind: 'SERVICES',
        filters,
        lastCheckedAt: start,
      })),
    });
    const store = await db.store.create({
      data: {
        name: 'Test vet',
        slug: prefix,
        categoryId: category,
        providerId: providerUser,
        address: 'Palermo',
        createdAt: new Date(cutoff.getTime() - 1000),
      },
    });
    await db.store.create({
      data: {
        name: 'Far away',
        slug: `${prefix}-far`,
        categoryId: category,
        providerId: providerUser,
        address: 'Córdoba',
        createdAt: new Date(cutoff.getTime() - 1000),
      },
    });
    await Promise.all([digestForUser(client, cutoff), digestForUser(client, cutoff)]);
    expect(await db.searchDigest.count({ where: { userId: client } })).toBe(1);
    expect(await db.searchDelivery.count({ where: { userId: client } })).toBe(1);
    expect(await db.searchDelivery.findFirst({ where: { userId: client } })).toMatchObject({
      entityId: store.id,
    });
    expect(await db.notification.count({ where: { userId: client, type: 'SEARCH_DIGEST' } })).toBe(
      1
    );
    await db.savedSearch.updateMany({ where: { userId: client }, data: { enabled: false } });
    await digestForUser(client, new Date(cutoff.getTime() + 86400000));
    expect(await db.notification.count({ where: { userId: client, type: 'SEARCH_DIGEST' } })).toBe(
      1
    );
  });
  it('keeps inbox membership and blocks private previews after blocking', async () => {
    await db.message.create({
      data: { matchId, senderId: friend, receiverId: client, content: 'Hola' },
    });
    const inbox = await getInbox(client);
    expect(inbox.find((r) => r.id === matchId)).toMatchObject({ unread: 1, preview: 'Hola' });
    expect((await getInbox(stranger)).some((r) => r.id === matchId)).toBe(false);
    const block = await db.blockedUser.create({ data: { blockerId: client, blockedId: friend } });
    expect((await getInbox(client)).some((r) => r.id === matchId)).toBe(false);
    await db.blockedUser.delete({ where: { id: block.id } });
  });
  it('includes foster conversations for a helper without a pet and uses the case contact URL', async () => {
    await db.owner.deleteMany({ where: { userId: stranger } });
    const fp = await db.fosterProfile.create({
      data: {
        userId: stranger,
        location: 'Palermo',
        latitude: -34.58,
        longitude: -58.42,
        housingType: 'house',
        experience: 'some',
        adultDeclaredAt: new Date(),
        termsAcceptedAt: new Date(),
        termsVersion: 'test',
      },
    });
    const rescueCase = await db.rescueCase.create({
      data: {
        createdByUserId: client,
        species: 'dog',
        size: 'medium',
        apparentCondition: 'Test',
        description: 'Test',
        images: '[]',
        location: 'Palermo',
        latitude: -34.58,
        longitude: -58.42,
        consentAcceptedAt: new Date(),
        consentVersion: 'test',
      },
    });
    const offer = await db.fosterOffer.create({
      data: {
        rescueCaseId: rescueCase.id,
        fosterProfileId: fp.id,
        status: 'INTERESTED',
        distanceKm: 1,
        score: 90,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    await db.message.create({
      data: {
        fosterOfferId: offer.id,
        senderId: client,
        receiverId: stranger,
        content: 'Coordinemos',
      },
    });
    expect((await getInbox(stranger)).find((r) => r.id === offer.id)).toMatchObject({
      kind: 'foster',
      unread: 1,
      href: `/hogares-de-transito/casos/${rescueCase.id}?contact=1&kind=foster&offer=${offer.id}`,
    });
  });
  it('shares adoption deduplication with immediate alerts and separates synthetic users', async () => {
    process.env.PRODUCT_SAVED_SEARCHES_ENABLED = 'true';
    const cutoff = new Date(Date.now() + 2 * 86400000);
    const start = new Date(cutoff.getTime() - 3600000);
    const listing = await db.adoptionListing.create({
      data: {
        petId: friendPet,
        listedByUserId: friend,
        createdAt: new Date(cutoff.getTime() - 1000),
        location: prefix,
      },
    });
    await db.savedSearch.create({
      data: {
        userId: client,
        name: 'Adoption',
        kind: 'ADOPTION',
        filters: searchFiltersSchema.parse({ zone: prefix }),
        lastCheckedAt: start,
      },
    });
    await createNotificationBulk(
      [client],
      friend,
      'SOLIDARITY_ADOPTION_ALERT',
      'Adoption',
      'New result',
      '/adoptions',
      listing.id,
      `test:${listing.id}`
    );
    await digestForUser(client, cutoff);
    expect(
      await db.searchDelivery.count({
        where: { userId: client, kind: 'ADOPTION', entityId: listing.id },
      })
    ).toBe(1);
    expect(await db.notification.count({ where: { userId: client, type: 'SEARCH_DIGEST' } })).toBe(
      1
    );
    const syntheticRun = await db.syntheticRun.create({
      data: { expiresAt: new Date(Date.now() + 86400000) },
    });
    try {
      await db.user.update({ where: { id: friend }, data: { syntheticRunId: syntheticRun.id } });
      await expect(
        requestAppointment(friend, { serviceId: service, petId: friendPet, date: future() })
      ).rejects.toMatchObject({ status: 404 });
      expect((await getInbox(client)).some((r) => r.id === matchId)).toBe(false);
    } finally {
      await db.user.update({ where: { id: friend }, data: { syntheticRunId: null } });
      await db.syntheticRun.delete({ where: { id: syntheticRun.id } });
    }
    delete process.env.PRODUCT_SAVED_SEARCHES_ENABLED;
  });
});
