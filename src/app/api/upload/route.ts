import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import sharp from 'sharp';

export const runtime = 'nodejs';

const MAX_INPUT_FILE_SIZE = 5 * 1024 * 1024;
const MAX_OUTPUT_FILE_SIZE = 600 * 1024;
const MAX_IMAGE_DIMENSION = 1200;
const OUTPUT_IMAGE_QUALITY = 78;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
  }

  // Rate limiting: max 5 uploads per minute per user
  const limit = await rateLimit(`upload:${session.user.id}`, RATE_LIMITS.upload);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: 'Límite de subidas excedido. Máximo 5 por minuto.' }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No se recibió ninguna imagen' }, { status: 400 });
    }

    if (file.size > MAX_INPUT_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'La imagen debe ser menor a 5MB' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Solo se permiten imágenes' }, { status: 400 });
    }

    if (file.type === 'image/svg+xml') {
      return NextResponse.json({ success: false, error: 'SVG no está permitido en este prototipo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const optimizedBuffer = await sharp(Buffer.from(bytes))
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: OUTPUT_IMAGE_QUALITY,
      })
      .toBuffer();

    if (optimizedBuffer.length > MAX_OUTPUT_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'La imagen sigue siendo muy pesada para este prototipo free. Usa una imagen más liviana.',
        },
        { status: 400 }
      );
    }

    // Persistimos la imagen inline para evitar filesystem efímero y servicios pagos.
    const dataUrl = `data:image/webp;base64,${optimizedBuffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error al procesar la imagen' }, { status: 500 });
  }
}
