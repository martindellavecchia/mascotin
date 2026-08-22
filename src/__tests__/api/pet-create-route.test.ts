const mockGetServerSession = jest.fn();
const mockOwnerUpsert = jest.fn();
const mockPetFindFirst = jest.fn();
const mockPetCreate = jest.fn();
const mockResolveCoordinates = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock('@/lib/auth', () => ({ authOptions: {} }));

jest.mock('@/lib/db', () => ({
  db: {
    owner: {
      upsert: (...args: unknown[]) => mockOwnerUpsert(...args),
    },
    pet: {
      findFirst: (...args: unknown[]) => mockPetFindFirst(...args),
      create: (...args: unknown[]) => mockPetCreate(...args),
    },
  },
}));

jest.mock('@/lib/passport', () => ({
  createEmergencyToken: () => 'emergency-token',
  createPublicSlug: (name: string) => `${name.toLowerCase()}-slug`,
}));

jest.mock('@/lib/pet-payload', () => ({
  extractPassportFields: () => ({}),
  resolveCoordinates: (...args: unknown[]) => mockResolveCoordinates(...args),
}));

import { POST } from '@/app/api/pet/create/route';

describe('POST /api/pet/create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', name: 'Ana', email: 'ana@example.com' },
    });
    mockOwnerUpsert.mockResolvedValue({ id: 'owner-1', location: '' });
    mockPetFindFirst.mockResolvedValue(null);
    mockResolveCoordinates.mockResolvedValue(null);
    mockPetCreate.mockResolvedValue({ id: 'pet-1', name: 'Mora', petType: 'dog' });
  });

  it('creates the owner shell and pet from name and type only', async () => {
    const request = {
      json: async () => ({ name: 'Mora', petType: 'dog' }),
    } as Request;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      success: true,
      pet: { id: 'pet-1', name: 'Mora', petType: 'dog' },
    });
    expect(mockOwnerUpsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: {},
      create: { userId: 'user-1', name: 'Ana', location: '' },
    });
    expect(mockPetCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerId: 'owner-1',
        name: 'Mora',
        petType: 'dog',
        age: 0,
        size: '',
        gender: '',
        energy: '',
        bio: '',
        location: '',
        activities: '[]',
        images: '[]',
      }),
    });
  });
});
