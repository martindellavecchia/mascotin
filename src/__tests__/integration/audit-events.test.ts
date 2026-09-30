import { randomUUID } from 'node:crypto';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { getFeedPage } from '@/lib/server/feed';
import { POST as createGroupPost, GET as listGroupPosts } from '@/app/api/groups/[id]/posts/route';
import { GET as readPost, PUT as editPost, DELETE as deletePost } from '@/app/api/posts/[id]/route';
import { PUT as editEvent, DELETE as deleteEvent } from '@/app/api/events/[id]/route';
import { POST as createEvent } from '@/app/api/events/route';
import { POST as createPost } from '@/app/api/posts/route';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const database = new URL(process.env.DATABASE_URL || 'https://invalid');
if (!['localhost', '127.0.0.1'].includes(database.hostname) || !database.pathname.startsWith('/product_')) {
  throw new Error('Audit tests require an isolated local product_ database');
}
const prefix = 'audit-' + randomUUID();
const author = prefix + '-author';
const admin = prefix + '-admin';
const stranger = prefix + '-stranger';
const groupId = prefix + '-group';
const instant = '2026-12-06T21:11:29.123Z';
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (body: unknown) => new Request('http://localhost/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const eventBody = { postType: 'event', title: 'Encuentro de prueba', content: 'Un paseo de prueba', eventDate: instant, eventLocation: 'Parque de prueba' };

beforeAll(async () => {
  await db.user.createMany({ data: [author, admin, stranger].map((id) => ({ id, name: id, email: id + '@example.test' })) });
  await db.group.create({ data: { id: groupId, creatorId: author, name: 'Grupo QA', description: 'Pruebas aisladas', members: { create: [{ userId: author, role: 'MEMBER' }, { userId: admin, role: 'ADMIN' }] } } });
  await db.$executeRawUnsafe("CREATE FUNCTION audit_reject_post() RETURNS trigger AS $$ BEGIN IF NEW.content = 'audit-reject-write' THEN RAISE EXCEPTION 'audit failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql");
  await db.$executeRawUnsafe('CREATE TRIGGER audit_reject_post BEFORE INSERT OR UPDATE ON "Post" FOR EACH ROW EXECUTE FUNCTION audit_reject_post()');
});

beforeEach(() => {
  (getServerSession as jest.Mock).mockResolvedValue({ user: { id: author } });
});

afterAll(async () => {
  await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS audit_reject_post ON "Post"');
  await db.$executeRawUnsafe('DROP FUNCTION IF EXISTS audit_reject_post()');
  await db.user.deleteMany({ where: { id: { in: [author, admin, stranger] } } });
  await db.$disconnect();
});

async function linkedPost() {
  const response = await createGroupPost(request(eventBody), params(groupId));
  expect(response.status).toBe(200);
  return (await response.json()).post as { id: string; eventId: string };
}

it('creates a linked event atomically and derives all post reads from the event', async () => {
  const post = await linkedPost();
  expect(post.eventId).toBeTruthy();
  const updated = '2026-12-07T02:30:01.456Z';
  (getServerSession as jest.Mock).mockResolvedValue({ user: { id: admin } });
  expect((await editEvent(request({ date: updated }), params(post.eventId))).status).toBe(200);
  expect((await db.post.findUniqueOrThrow({ where: { id: post.id } })).eventDate?.toISOString()).toBe(instant);
  expect((await (await readPost(request({}), params(post.id))).json()).post.eventDate).toBe(updated);
  const group = await (await listGroupPosts(request({}), params(groupId))).json();
  expect(group.posts.find((item: { id: string }) => item.id === post.id).eventDate).toBe(updated);
  const feed = await getFeedPage({ userId: author, limit: 100 });
  expect(feed.posts.find((item) => item.id === post.id)?.eventDate).toBe(updated);
});

it('preserves an event instant when editing only its title', async () => {
  const post = await linkedPost();
  const response = await editEvent(request({ title: 'Nuevo título' }), params(post.eventId));
  expect(response.status).toBe(200);
  expect((await response.json()).event.date).toBe(instant);
});

it('updates the canonical date through the post editor', async () => {
  const post = await linkedPost();
  const changed = '2026-12-08T03:00:00.000Z';
  const response = await editPost(request({ eventDate: changed }), params(post.id));
  expect(response.status).toBe(200);
  expect((await db.event.findUniqueOrThrow({ where: { id: post.eventId } })).date.toISOString()).toBe(changed);
});

it.each(['2026-12-06T18:11', '2026-02-30T18:11:00Z', 'not-a-date'])('rejects invalid or ambiguous dates without partial creation: %s', async (date) => {
  const before = await db.event.count();
  expect((await createGroupPost(request({ ...eventBody, eventDate: date }), params(groupId))).status).toBe(400);
  expect((await createPost(request({ ...eventBody, eventDate: date }))).status).toBe(400);
  expect((await createEvent(request({ title: 'Evento', location: 'Parque', date }))).status).toBe(400);
  expect(await db.event.count()).toBe(before);
});

it('rolls back both group and general event creation if the post write fails', async () => {
  const before = await db.event.count();
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect((await createGroupPost(request({ ...eventBody, content: 'audit-reject-write' }), params(groupId))).status).toBe(500);
    expect((await createPost(request({ ...eventBody, content: 'audit-reject-write' }))).status).toBe(500);
    expect(await db.event.count()).toBe(before);
  } finally { log.mockRestore(); }
});

it('rolls back the canonical event update if the post write fails', async () => {
  const post = await linkedPost();
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect((await editPost(request({ content: 'audit-reject-write', eventDate: '2026-12-09T10:00:00Z' }), params(post.id))).status).toBe(500);
    expect((await db.event.findUniqueOrThrow({ where: { id: post.eventId } })).date.toISOString()).toBe(instant);
  } finally { log.mockRestore(); }
});

it('preserves author and group-admin permission boundaries', async () => {
  const post = await linkedPost();
  (getServerSession as jest.Mock).mockResolvedValue({ user: { id: stranger } });
  expect((await editEvent(request({ date: instant }), params(post.eventId))).status).toBe(403);
  expect((await editPost(request({ eventDate: instant }), params(post.id))).status).toBe(403);
  (getServerSession as jest.Mock).mockResolvedValue({ user: { id: admin } });
  expect((await editEvent(request({ title: 'Cambio del administrador' }), params(post.eventId))).status).toBe(200);
  expect((await editPost(request({ content: 'Texto ajeno' }), params(post.id))).status).toBe(403);
});

it('keeps legacy unlinked posts independent and does not infer event relationships', async () => {
  const legacy = await db.post.create({ data: { authorId: author, groupId, content: eventBody.content, postType: 'event', images: '[]', eventDate: new Date(instant), eventLocation: eventBody.eventLocation } });
  const count = await db.event.count();
  const response = await editPost(request({ content: 'Texto histórico editado' }), params(legacy.id));
  expect(response.status).toBe(200);
  const post = (await response.json()).post;
  expect(post.eventId).toBeNull();
  expect(post.eventDate).toBe(instant);
  expect(await db.event.count()).toBe(count);
});

it('removes event actions from surviving posts when the event is deleted', async () => {
  const post = await linkedPost();
  expect((await deleteEvent(request({}), params(post.eventId))).status).toBe(200);
  const saved = await db.post.findUniqueOrThrow({ where: { id: post.id } });
  expect(saved).toMatchObject({ postType: 'post', eventId: null, eventDate: null, eventLocation: null, content: eventBody.content });
});

it('retains the independent event when its post is deleted or converted to text', async () => {
  const removed = await linkedPost();
  expect((await deletePost(request({}), params(removed.id))).status).toBe(200);
  expect(await db.event.findUnique({ where: { id: removed.eventId } })).not.toBeNull();
  const converted = await linkedPost();
  expect((await editPost(request({ postType: 'post', eventDate: null, eventLocation: null }), params(converted.id))).status).toBe(200);
  expect((await db.post.findUniqueOrThrow({ where: { id: converted.id } })).eventId).toBeNull();
  expect(await db.event.findUnique({ where: { id: converted.eventId } })).not.toBeNull();
});
