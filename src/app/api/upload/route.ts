import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import path from 'path';

export const runtime = 'nodejs';

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
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large. Max 5MB' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Only images allowed' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'profile-images', session.user.id);

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Validar extensión contra lista blanca (fix de seguridad)
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!ext || !allowedExtensions.includes(ext)) {
      return NextResponse.json({ success: false, error: 'Invalid file extension. Allowed: jpg, jpeg, png, gif, webp' }, { status: 400 });
    }

    const timestamp = Date.now();
    const filename = `${timestamp}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    return NextResponse.json({
      success: true,
      url: `/profile-images/${session.user.id}/${filename}`
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error uploading file' }, { status: 500 });
  }
}
