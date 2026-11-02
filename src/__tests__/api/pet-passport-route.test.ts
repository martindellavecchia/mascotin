const mockGetServerSession = jest.fn();
const mockPetFindUnique = jest.fn();
const mockPetFindFirst = jest.fn();
const mockCanViewPublicPet = jest.fn();

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
      findFirst: (...args: unknown[]) => mockPetFindFirst(...args),
    },
  },
}));

jest.mock('@/lib/pet-payload', () => ({
  ensurePetIdentity: async () => ({}),
}));

jest.mock('@/lib/server/pet-access', () => ({
  canViewPublicPet: (...args: unknown[]) => mockCanViewPublicPet(...args),
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
  vetClinicName: 'Clínica Norte',
  latitude: -34.58,
  longitude: -58.42,
  careRole: 'OWNED',
  location: 'Thames 1234, Palermo, CABA',
  owner: { id: 'owner-1', name: 'Ana', location: 'Palermo', image: null },
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
    mockPetFindFirst.mockResolvedValue(null);
    mockCanViewPublicPet.mockResolvedValue(true);
  });

  it('devuelve los datos privados de salud al dueño', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-owner' } });
    mockPetFindFirst.mockResolvedValue(storedPet);
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
    expect(data.pet.microchipId).toBeUndefined();
    expect(data.pet.emergencyToken).toBeUndefined();
    expect(data.pet.allergies).toBeUndefined();
    expect(data.pet.vetClinicName).toBeUndefined();
    expect(data.pet.latitude).toBeUndefined();
    expect(data.pet.longitude).toBeUndefined();
    expect(data.pet.location).toBe('Palermo, CABA');
    expect(data.pet.owner).toEqual({ name: 'Ana', location: 'Palermo', image: null });
  });

  it('responde 404 si la relación está bloqueada o el perfil está oculto', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'someone-else' } });
    mockCanViewPublicPet.mockResolvedValue(false);
    const response = await GET(new Request('http://localhost/api/pet/pet-1/passport'), {
      params: Promise.resolve({ id: 'pet-1' }),
    });

    expect(response.status).toBe(404);
  });
});
