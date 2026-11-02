import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/token-hash';
import { GET as listMembers } from '@/app/api/groups/[id]/members/route';
import { POST as changePassword } from '@/app/api/settings/change-password/route';
import { DELETE as deleteAccount } from '@/app/api/settings/account/route';
import { POST as resetPassword } from '@/app/api/auth/reset-password/route';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  RATE_LIMITS: { auth: {} },
}));

const database = new URL(process.env.DATABASE_URL || 'https://invalid');
if (!['localhost', '127.0.0.1'].includes(database.hostname) || !database.pathname.startsWith('/product_')) {
  throw new Error('Account credential tests require an isolated local product_ database');
}

const prefix = 'cred-' + randomUUID();
const memberId = prefix + '-member';
const outsiderId = prefix + '-outsider';
const groupId = prefix + '-group';
const email = (id: string) => `${id}@example.test`;
const originalPassword = 'Original123';
const session = (id: string) => (getServerSession as jest.Mock).mockResolvedValue({ user: { id } });
const jsonRequest = (body: unknown) =>
  new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

type Authorize = (credentials: { email: string; password: string }) => Promise<{ id: string } | null>;
const login = (id: string, password: string) => {
  const provider = authOptions.providers[0] as unknown as { options: { authorize: Authorize } };
  return provider.options.authorize({ email: email(id), password });
};

beforeAll(async () => {
  const password = await bcrypt.hash(originalPassword, 4);
  await db.user.createMany({
    data: [memberId, outsiderId].map((id) => ({ id, name: id, email: email(id), password })),
  });
  await db.group.create({
    data: {
      id: groupId,
      creatorId: memberId,
      name: 'Grupo QA',
      description: 'Grupo de prueba',
      members: { create: { userId: memberId, role: 'ADMIN' } },
    },
  });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.verificationToken.deleteMany({ where: { identifier: { contains: prefix } } });
  await db.$disconnect();
});

describe('credenciales de cuenta', () => {
  it('no expone la contraseña en consultas sin select explícito', async () => {
    const user = await db.user.findUnique({ where: { id: memberId } });
    const membership = await db.groupMember.findFirst({ where: { groupId }, include: { user: true } });

    expect(user).not.toHaveProperty('password');
    expect(membership?.user).not.toHaveProperty('password');
  });

  it('el login valida la contraseña', async () => {
    await expect(login(memberId, originalPassword)).resolves.toMatchObject({ id: memberId });
    await expect(login(memberId, 'Incorrecta123')).resolves.toBeNull();
  });

  it('el cambio de contraseña verifica la actual y reemplaza la anterior', async () => {
    session(memberId);

    const rejected = await changePassword(jsonRequest({ currentPassword: 'Incorrecta123', newPassword: 'Cambiada123' }));
    expect(rejected.status).toBe(400);

    const changed = await changePassword(jsonRequest({ currentPassword: originalPassword, newPassword: 'Cambiada123' }));
    expect(changed.status).toBe(200);

    await expect(login(memberId, 'Cambiada123')).resolves.toMatchObject({ id: memberId });
    await expect(login(memberId, originalPassword)).resolves.toBeNull();
  });

  it('el restablecimiento por token reemplaza la contraseña', async () => {
    const token = randomUUID();
    await db.verificationToken.create({
      data: {
        identifier: `reset:${email(outsiderId)}`,
        token: hashToken(token),
        expires: new Date(Date.now() + 60_000),
      },
    });

    const response = await resetPassword(jsonRequest({ token, password: 'Restablecida123' }));

    expect(response.status).toBe(200);
    await expect(login(outsiderId, 'Restablecida123')).resolves.toMatchObject({ id: outsiderId });
  });

  it('el borrado de cuenta verifica la contraseña', async () => {
    const id = prefix + '-delete';
    await db.user.create({
      data: { id, name: id, email: email(id), password: await bcrypt.hash(originalPassword, 4) },
    });
    session(id);

    const rejected = await deleteAccount(jsonRequest({ password: 'Incorrecta123' }));
    expect(rejected.status).toBe(400);

    const deleted = await deleteAccount(jsonRequest({ password: originalPassword }));
    expect(deleted.status).toBe(200);
    await expect(db.user.findUnique({ where: { id } })).resolves.toBeNull();
  });
});

describe('GET /api/groups/[id]/members', () => {
  const list = () =>
    listMembers(new Request('http://localhost/api/test'), { params: { id: groupId } });

  it('devuelve solo los datos públicos de los miembros', async () => {
    session(memberId);

    const response = await list();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.members).toHaveLength(1);
    expect(Object.keys(body.members[0]).sort()).toEqual(['id', 'joinedAt', 'role', 'user']);
    expect(Object.keys(body.members[0].user).sort()).toEqual(['id', 'image', 'name']);
  });

  it('rechaza a quien no es miembro', async () => {
    session(outsiderId);

    const response = await list();

    expect(response.status).toBe(403);
  });
});
