import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { sendEmail, buildVerificationEmail } from '@/lib/email';

const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export async function POST(request: Request) {
  try {
    // Rate limit by IP (or forwarded header)
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const limit = await rateLimit(`register:${ip}`, RATE_LIMITS.register);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const { name, email, password } = parsed.data;

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'El email ya está registrado' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    } as any);

    // Create email verification token (expires in 24 hours)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await db.verificationToken.create({
      data: {
        identifier: email,
        token: verificationToken,
        expires: new Date(Date.now() + 86400000), // 24 hours
      },
    });

    // Send verification email
    const emailData = buildVerificationEmail(name, verificationToken);
    await sendEmail({
      to: email,
      subject: emailData.subject,
      html: emailData.html,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      message: 'Cuenta creada. Revisa tu email para verificar tu cuenta.',
    });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear cuenta' },
      { status: 500 }
    );
  }
}
