import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { hashToken } from '@/lib/token-hash';

const resetSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una minúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
});

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const limit = await rateLimit(`reset-password:${ip}`, RATE_LIMITS.auth);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;
    const hashedToken = hashToken(token);

    const verificationToken = await db.verificationToken.findUnique({
      where: { token: hashedToken },
    });

    if (!verificationToken || !verificationToken.identifier.startsWith('reset:')) {
      return NextResponse.json(
        { success: false, error: 'Token inválido o ya utilizado' },
        { status: 400 }
      );
    }

    if (verificationToken.expires < new Date()) {
      await db.verificationToken.delete({ where: { token: hashedToken } });
      return NextResponse.json(
        { success: false, error: 'El token ha expirado. Solicita uno nuevo.' },
        { status: 400 }
      );
    }

    // Extract email from identifier (format: "reset:email@example.com")
    const email = verificationToken.identifier.replace('reset:', '');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and delete token
    await db.$transaction([
      db.user.update({
        where: { email },
        data: { password: hashedPassword },
      }),
      db.verificationToken.delete({
        where: { token: hashedToken },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { success: false, error: 'Error al restablecer contraseña' },
      { status: 500 }
    );
  }
}
