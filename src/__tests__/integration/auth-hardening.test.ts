import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { POST as forgotPassword } from '@/app/api/auth/forgot-password/route';
import { POST as resetPassword } from '@/app/api/auth/reset-password/route';
import { POST as sendMessage } from '@/app/api/messages/route';
import { POST as register } from '@/app/api/register/route';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  buildPasswordResetEmail: jest.fn(() => ({ subject: 'x', html: 'x' })),
  buildVerificationEmail: jest.fn(() => ({ subject: 'x', html: 'x' })),
}));
jest.mock('@/lib/notifications', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

const database = new URL(process.env.DATABASE_URL || 'https://invalid');
if (!['localhost', '127.0.0.1'].includes(database.hostname) || !database.pathname.startsWith('/product_')) {
  throw new Error('Auth hardening tests require an isolated local product_ database');
}

const prefix = 'auth-hardening-' + randomUUID();
const email = (name: string) => `${prefix}-${name}@example.test`;
const PASSWORD = 'Original123';
const BEFORE_CUTOFF = new Date('2026-01-01T00:00:00.000Z');
const AFTER_CUTOFF = new Date('2026-11-03T00:00:00.000Z');

process.env.ADMIN_EMAILS = ['stored-admin', 'old-unverified', 'old-verified', 'new-unverified', 'new-verified', 'registered']
  .map(email)
  .join(', ');

type Authorize = (
  credentials: { email: string; password: string },
  req: { headers: Record<string, string> }
) => Promise<{ id: string; role?: string } | null>;
const authorize = (authOptions.providers[0] as unknown as { options: { authorize: Authorize } }).options.authorize;
const login = (address: string, password = PASSWORD, ip = '203.0.113.1') =>
  authorize({ email: address, password }, { headers: { 'x-forwarded-for': ip } });
const jsonRequest = (body: unknown, ip = '203.0.113.9') =>
  new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
const session = (id: string) => (getServerSession as jest.Mock).mockResolvedValue({ user: { id, name: 'QA' } });
let passwordHash = '';

async function createUser(
  name: string,
  data: { role?: 'OWNER' | 'ADMIN'; createdAt?: Date; emailVerified?: Date | null } = {}
) {
  return db.user.create({
    data: { id: `${prefix}-${name}`, name, email: email(name), password: passwordHash, ...data },
  });
}
const storedRole = async (name: string) =>
  (await db.user.findUniqueOrThrow({ where: { id: `${prefix}-${name}` }, select: { role: true } })).role;
const clearBuckets = () => db.rateLimitBucket.deleteMany({});

beforeAll(async () => {
  passwordHash = await bcrypt.hash(PASSWORD, 4);
});

beforeEach(clearBuckets);

afterAll(async () => {
  await clearBuckets();
  await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await db.$disconnect();
});

describe('promoción por ADMIN_EMAILS', () => {
  it('un admin guardado conserva el rol, esté o no en la lista y sin email verificado', async () => {
    await createUser('stored-admin', { role: 'ADMIN', createdAt: AFTER_CUTOFF, emailVerified: null });
    await createUser('unlisted-admin', { role: 'ADMIN', createdAt: AFTER_CUTOFF, emailVerified: null });

    await expect(login(email('stored-admin'))).resolves.toMatchObject({ role: 'ADMIN' });
    await expect(login(email('unlisted-admin'))).resolves.toMatchObject({ role: 'ADMIN' });
    await expect(storedRole('stored-admin')).resolves.toBe('ADMIN');
    await expect(storedRole('unlisted-admin')).resolves.toBe('ADMIN');
  });

  it('una cuenta anterior al corte se sigue promoviendo aunque no esté verificada', async () => {
    await createUser('old-unverified', { createdAt: BEFORE_CUTOFF, emailVerified: null });
    await createUser('old-verified', { createdAt: BEFORE_CUTOFF, emailVerified: BEFORE_CUTOFF });

    await expect(login(email('old-unverified'))).resolves.toMatchObject({ role: 'ADMIN' });
    await expect(login(email('old-verified'))).resolves.toMatchObject({ role: 'ADMIN' });
    await expect(storedRole('old-unverified')).resolves.toBe('ADMIN');
  });

  it('una cuenta nueva sin verificar entra pero no se promueve', async () => {
    await createUser('new-unverified', { createdAt: AFTER_CUTOFF, emailVerified: null });

    await expect(login(email('new-unverified'))).resolves.toMatchObject({ role: 'OWNER' });
    await expect(storedRole('new-unverified')).resolves.toBe('OWNER');
  });

  it('una cuenta nueva con el email verificado se promueve', async () => {
    await createUser('new-verified', { createdAt: AFTER_CUTOFF, emailVerified: AFTER_CUTOFF });

    await expect(login(email('new-verified'))).resolves.toMatchObject({ role: 'ADMIN' });
  });

  it('registrar una dirección de la lista no la deja verificada ni la promueve', async () => {
    const address = email('registered');

    const response = await register(jsonRequest({ name: 'Persona', email: address, password: PASSWORD }));
    expect(response.status).toBe(200);
    const user = await db.user.findUniqueOrThrow({ where: { email: address }, select: { emailVerified: true } });
    expect(user.emailVerified).toBeNull();

    await expect(login(address)).resolves.toMatchObject({ role: 'OWNER' });
  });
});

describe('límites de login', () => {
  beforeAll(async () => {
    await createUser('limited', { createdAt: BEFORE_CUTOFF });
  });

  it('corta por IP y email entre instancias, sin afectar a otra IP', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await expect(login(email('limited'), 'Incorrecta123')).resolves.toBeNull();
    }

    await expect(login(email('limited'))).resolves.toBeNull();
    await expect(login(email('limited'), PASSWORD, '203.0.113.2')).resolves.toMatchObject({ role: 'OWNER' });
  });

  it('corta por cuenta aunque los intentos vengan de muchas IP', async () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      await login(email('limited'), 'Incorrecta123', `198.51.100.${attempt}`);
    }

    await expect(login(email('limited'), PASSWORD, '203.0.113.3')).resolves.toBeNull();
  });

  it('no guarda el email en la clave del límite', async () => {
    await login(email('limited'));
    const buckets = await db.rateLimitBucket.findMany({ select: { key: true } });

    expect(buckets.length).toBeGreaterThan(0);
    expect(JSON.stringify(buckets)).not.toContain(prefix);
  });

  it('si falla la tabla de límites se puede seguir entrando con el límite por instancia', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await db.$executeRawUnsafe('ALTER TABLE "RateLimitBucket" RENAME TO "RateLimitBucketOff"');
    try {
      await expect(login(email('limited'), PASSWORD, '203.0.113.4')).resolves.toMatchObject({ role: 'OWNER' });
      await expect(login(email('limited'), 'Incorrecta123', '203.0.113.4')).resolves.toBeNull();
      expect(consoleError).toHaveBeenCalledWith('Distributed database rate limit fell back to memory:', expect.anything());
    } finally {
      await db.$executeRawUnsafe('ALTER TABLE "RateLimitBucketOff" RENAME TO "RateLimitBucket"');
      consoleError.mockRestore();
    }
  });
});

describe('límites de cuenta', () => {
  it('olvidé mi contraseña corta por dirección aunque cambie la IP', async () => {
    const address = email('forgot');
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      statuses.push((await forgotPassword(jsonRequest({ email: address }, `192.0.2.${attempt}`))).status);
    }

    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it('restablecer corta por IP', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
      statuses.push((await resetPassword(jsonRequest({ token: 'x', password: 'Valida12345' }))).status);
    }

    expect(statuses[10]).toBe(429);
    expect(statuses.slice(0, 10).every((status) => status === 400)).toBe(true);
  });

  it('registrarse corta por IP', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      statuses.push((await register(jsonRequest({ email: 'no-es-email' }))).status);
    }

    expect(statuses).toEqual([400, 400, 400, 400, 400, 429]);
  });
});

describe('POST /api/messages', () => {
  let matchId = '';
  const sender = () => `${prefix}-sender`;
  const receiver = () => `${prefix}-receiver`;

  beforeAll(async () => {
    await createUser('sender');
    await createUser('receiver');
    const pets = await Promise.all([sender(), receiver()].map(async (userId) => {
      const owner = await db.owner.create({ data: { userId, name: userId, location: 'CABA' } });
      return db.pet.create({
        data: { ownerId: owner.id, name: userId, petType: 'dog', age: 2, size: 'medium', gender: 'female', energy: 'medium', bio: '', activities: '[]', location: 'CABA', images: '[]' },
      });
    }));
    const match = await db.match.create({ data: { pet1Id: pets[0].id, pet2Id: pets[1].id } });
    matchId = match.id;
  });

  afterEach(() => db.blockedUser.deleteMany({ where: { blockerId: { startsWith: prefix } } }));

  it('acepta un mensaje válido y rechaza el demasiado largo', async () => {
    session(sender());

    expect((await sendMessage(jsonRequest({ matchId, content: 'Hola' }))).status).toBe(200);
    expect((await sendMessage(jsonRequest({ matchId, content: 'a'.repeat(2001) }))).status).toBe(400);
  });

  it.each([
    ['quien envía bloqueó', () => ({ blockerId: sender(), blockedId: receiver() })],
    ['quien recibe bloqueó', () => ({ blockerId: receiver(), blockedId: sender() })],
  ])('rechaza el mensaje si %s', async (_name, relation) => {
    await db.blockedUser.create({ data: relation() });
    session(sender());
    const before = await db.message.count({ where: { matchId } });

    expect((await sendMessage(jsonRequest({ matchId, content: 'Hola' }))).status).toBe(403);
    expect(await db.message.count({ where: { matchId } })).toBe(before);
  });

  it('corta al superar el tope por minuto', async () => {
    session(sender());
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 31; attempt += 1) {
      statuses.push((await sendMessage(jsonRequest({ matchId, content: '' }))).status);
    }

    expect(statuses.slice(0, 30).every((status) => status === 400)).toBe(true);
    expect(statuses[30]).toBe(429);
  });
});
