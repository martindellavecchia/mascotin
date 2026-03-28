import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { sendEmail, buildPasswordResetEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const limit = await rateLimit(`forgot-password:${ip}`, RATE_LIMITS.auth);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email requerido' },
        { status: 400 }
      );
    }

    // Always return success to prevent email enumeration
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (user) {
      // Delete any existing reset tokens for this user
      await db.verificationToken.deleteMany({
        where: {
          identifier: `reset:${email}`,
        },
      });

      // Create new reset token (expires in 1 hour)
      const token = crypto.randomBytes(32).toString('hex');
      await db.verificationToken.create({
        data: {
          identifier: `reset:${email}`,
          token,
          expires: new Date(Date.now() + 3600000), // 1 hour
        },
      });

      // Send email
      const emailData = buildPasswordResetEmail(user.name || 'Usuario', token);
      await sendEmail({
        to: email,
        subject: emailData.subject,
        html: emailData.html,
      });
    }

    // Always return success (prevent enumeration)
    return NextResponse.json({
      success: true,
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.',
    });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar solicitud' },
      { status: 500 }
    );
  }
}
