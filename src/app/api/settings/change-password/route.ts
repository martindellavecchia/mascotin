import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { changePasswordSchema } from '@/lib/schemas';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const limit = await rateLimit(`change-password:${session.user.id}`, RATE_LIMITS.auth);
        if (!limit.allowed) {
            return NextResponse.json({ success: false, error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 });
        }

        const body = await request.json();
        const parsed = changePasswordSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: 'Datos inválidos', details: parsed.error.issues }, { status: 400 });
        }

        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { password: true },
        });

        if (!user?.password) {
            return NextResponse.json({ success: false, error: 'Tu cuenta no tiene contraseña configurada' }, { status: 400 });
        }

        const isValid = await bcrypt.compare(parsed.data.currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json({ success: false, error: 'La contraseña actual es incorrecta' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);
        await db.user.update({
            where: { id: session.user.id },
            data: { password: hashedPassword },
        });

        return NextResponse.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error changing password:', error);
        return NextResponse.json({ success: false, error: 'Error al cambiar contraseña' }, { status: 500 });
    }
}
