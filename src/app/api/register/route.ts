import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { sendEmail, buildVerificationEmail } from '@/lib/email';
import { hashToken } from '@/lib/token-hash';
import { registerSchema } from '@/lib/schemas';

export async function POST(request: Request) {
  try {
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
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Datos inválidos',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }
    const { name, password } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    const existingUser = await db.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'El email ya está registrado' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const hasEmailProvider = Boolean(process.env.RESEND_API_KEY);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        ...(hasEmailProvider ? {} : { emailVerified: new Date() }),
      },
    });

    if (hasEmailProvider) {
      try {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        await db.verificationToken.create({
          data: {
            identifier: email,
            token: hashToken(verificationToken),
            expires: new Date(Date.now() + 86400000),
          },
        });

        const emailData = buildVerificationEmail(name, verificationToken);
        await sendEmail({
          to: email,
          subject: emailData.subject,
          html: emailData.html,
        });
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      message: hasEmailProvider
        ? 'Cuenta creada. Revisa tu email para verificar tu cuenta.'
        : 'Cuenta creada exitosamente.',
    });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear cuenta' },
      { status: 500 }
    );
  }
}
