const mockSession = jest.fn();
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status: number }) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));
jest.mock('next-auth/next', () => ({ getServerSession: () => mockSession() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@vercel/blob', () => ({ put: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  RATE_LIMITS: { upload: {} },
}));

import sharp from 'sharp';
import { POST } from '@/app/api/upload/route';

const canvas = () =>
  sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 75, g: 36, b: 74 } } });

const upload = (input: Buffer, type: string) => {
  const bytes = Uint8Array.from(input);
  const file = { size: bytes.length, type, arrayBuffer: async () => bytes.buffer };
  return POST({ formData: async () => ({ get: () => file }) } as unknown as Request);
};

describe('POST /api/upload', () => {
  beforeEach(() => {
    mockSession.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it.each([
    ['image/jpeg', () => canvas().jpeg().toBuffer()],
    ['image/png', () => canvas().png().toBuffer()],
    ['image/webp', () => canvas().webp().toBuffer()],
    ['image/gif', () => canvas().gif().toBuffer()],
    ['image/avif', () => canvas().avif().toBuffer()],
  ])('acepta %s y lo convierte a WebP', async (type, build) => {
    const response = await upload(await build(), type);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toMatch(/^data:image\/webp;base64,/);
  });

  it('rechaza un archivo cuyo formato real no coincide con el declarado', async () => {
    const response = await upload(await canvas().png().toBuffer(), 'image/jpeg');

    expect(response.status).toBe(400);
  });

  it('rechaza un SVG declarado como PNG', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>');
    const response = await upload(svg, 'image/png');

    expect(response.status).toBe(400);
  });

  it('rechaza un formato real fuera de los permitidos', async () => {
    const response = await upload(await canvas().tiff().toBuffer(), 'image/tiff');

    expect(response.status).toBe(400);
  });

  it('rechaza contenido que no es una imagen', async () => {
    const response = await upload(Buffer.from('no soy una imagen'), 'image/png');

    expect(response.status).toBe(422);
  });

  it('exige sesión', async () => {
    mockSession.mockResolvedValue(null);
    const response = await upload(await canvas().png().toBuffer(), 'image/png');

    expect(response.status).toBe(401);
  });
});
