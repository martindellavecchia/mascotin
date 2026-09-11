const mockSession = jest.fn();
const mockExisting = jest.fn();
const mockEvent = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status: number }) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));
jest.mock('next-auth', () => ({ getServerSession: () => mockSession() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/notifications', () => ({ createNotification: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/db', () => ({
  db: {
    event: { findUnique: () => mockEvent() },
    eventAttendee: {
      findUnique: () => mockExisting(),
      create: () => mockCreate(),
      delete: () => mockDelete(),
    },
  },
}));
import { POST } from '@/app/api/events/[id]/attend/route';

describe('vigencia de asistencia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { id: 'u' } });
    mockExisting.mockResolvedValue(null);
  });
  it('rechaza asistir a un evento pasado sin escribir una inscripción', async () => {
    mockEvent.mockResolvedValue({ date: new Date(0) });
    expect((await POST({} as Request, { params: { id: 'event' } })).status).toBe(409);
    expect(mockCreate).not.toHaveBeenCalled();
  });
  it('permite retirar una asistencia existente aunque el evento haya finalizado', async () => {
    mockExisting.mockResolvedValue({ id: 'attendance' });
    expect((await POST({} as Request, { params: { id: 'event' } })).status).toBe(200);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
