const mockGetServerSession = jest.fn();
const mockPetFindUnique = jest.fn();

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
    pet: {
      findUnique: (...args: unknown[]) => mockPetFindUnique(...args),
    },
  },
}));

jest.mock('@/lib/pet-payload', () => ({
  ensurePetIdentity: async () => ({}),
}));

import { GET } from '@/app/api/pet/[id]/passport/route';

const storedPet = {
  id: 'pet-1',
  name: 'Luna',
  images: '[]',
  thumbnailIndex: 0,
  microchipId: '985112000000001',
  emergencyToken: 'secret-token',
  allergies: 'Pollo',
  owner: { id: 'owner-1', name: 'Ana', location: 'Palermo', image: null, userId: 'user-owner' },
  healthRecords: [{ id: 'rec-1', type: 'VACCINE', name: 'Antirrábica', dueDate: null, completedAt: null }],
};

async function requestPassport() {
  const response = await GET(new Request('http://localhost/api/pet/pet-1/passport'), {
    params: Promise.resolve({ id: 'pet-1' }),
  });
  return response.json();
}

describe('GET /api/pet/[id]/passport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPetFindUnique.mockResolvedValue(storedPet);
  });

  it('devuelve los datos privados de salud al dueño', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-owner' } });
    const data = await requestPassport();

    expect(data.pet.isOwner).toBe(true);
    expect(data.pet.healthRecords).toHaveLength(1);
    expect(data.pet.microchipId).toBe('985112000000001');
    expect(data.pet.emergencyToken).toBe('secret-token');
    expect(data.pet.owner.userId).toBeUndefined();
  });

  it('oculta registros, microchip y token de emergencia a otras personas', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'someone-else' } });
    const data = await requestPassport();

    expect(data.pet.isOwner).toBe(false);
    expect(data.pet.healthRecords).toEqual([]);
    expect(data.pet.microchipId).toBeNull();
    expect(data.pet.emergencyToken).toBeNull();
    expect(data.pet.allergies).toBe('Pollo');
    expect(data.pet.owner.userId).toBeUndefined();
  });
});
