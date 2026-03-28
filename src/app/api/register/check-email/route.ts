import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    // Rate limit to prevent email enumeration
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const limit = await rateLimit(`email-check:${ip}`, RATE_LIMITS.emailCheck);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'El email es requerido' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    return NextResponse.json({
      success: true,
      available: !existingUser,
    });
  } catch (error) {
    console.error('Error checking email:', error);
    return NextResponse.json(
      { success: false, error: 'Error al verificar email' },
      { status: 500 }
    );
  }
}