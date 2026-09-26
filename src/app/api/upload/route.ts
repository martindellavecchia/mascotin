import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import sharp from 'sharp';
import { put } from '@vercel/blob';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const MAX_INPUT_FILE_SIZE = 5 * 1024 * 1024;
const MAX_OUTPUT_FILE_SIZE = 600 * 1024;
const MAX_IMAGE_DIMENSION = 1200;
const OUTPUT_IMAGE_QUALITY = 78;
const log = logger.forRoute('/api/upload', 'POST');

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
      return NextResponse.json({ success: false, error: 'Las imágenes SVG no están permitidas. Usá JPG, PNG o WebP.' }, { status: 400 });
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

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`uploads/${session.user.id}/${Date.now()}.webp`, optimizedBuffer, {
          access: 'public',
          contentType: 'image/webp',
          addRandomSuffix: true,
        });
        return NextResponse.json({ success: true, url: blob.url });
      } catch (error) {
        log.error('Blob upload failed', error, { userId: session.user.id });
        return NextResponse.json(
          { success: false, error: 'No pudimos guardar la imagen. Intentá de nuevo en unos segundos.' },
          { status: 502 }
        );
      }
    }

    if (optimizedBuffer.length > MAX_OUTPUT_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'La imagen es demasiado pesada. Probá con una foto más liviana o recortada.',
        },
        { status: 400 }
      );
    }

    // Without Blob storage configured, images are stored inline because the serverless filesystem is ephemeral.
    const dataUrl = `data:image/webp;base64,${optimizedBuffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
    });
  } catch (error) {
    log.error('Image processing failed', error, { userId: session.user.id });
    return NextResponse.json(
      {
        success: false,
        error: 'No pudimos leer esa imagen. Probá con un archivo JPG, PNG o WebP.',
      },
      { status: 422 }
    );
  }
}
