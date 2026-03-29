import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/token-hash';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token requerido' },
        { status: 400 }
      );
    }

    const hashedToken = hashToken(token);

    const verificationToken = await db.verificationToken.findUnique({
      where: { token: hashedToken },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { success: false, error: 'Token inválido o ya utilizado' },
        { status: 400 }
      );
    }

    if (verificationToken.identifier.startsWith('reset:')) {
      return NextResponse.json(
        { success: false, error: 'Token inválido para verificación de email' },
        { status: 400 }
      );
    }

    if (verificationToken.expires < new Date()) {
      await db.verificationToken.delete({
        where: { token: hashedToken },
      });
      return NextResponse.json(
        { success: false, error: 'El token ha expirado. Solicita uno nuevo.' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: verificationToken.identifier },
      select: { id: true, emailVerified: true },
    });

    if (!user) {
      await db.verificationToken.delete({ where: { token: hashedToken } });
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado para este token' },
        { status: 400 }
      );
    }

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { emailVerified: user.emailVerified || new Date() },
      }),
      db.verificationToken.delete({
        where: { token: hashedToken },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Email verificado correctamente',
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json(
      { success: false, error: 'Error al verificar email' },
      { status: 500 }
    );
  }
}
