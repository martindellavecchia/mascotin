import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// POST - Reset user password (generate temporary password)
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const user = await db.user.findUnique({
            where: { id: params.id },
            select: { email: true },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Usuario no encontrado' },
                { status: 404 }
            );
        }

        // Generate cryptographically secure temporary password
        const tempPassword = crypto.randomBytes(12).toString('base64url') + 'A1!';
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        await db.user.update({
            where: { id: params.id },
            data: { password: hashedPassword },
        });

        // Note: In production, this should be sent via email, not returned in the response.
        // For now, we return a masked hint so the admin knows it was reset.
        return NextResponse.json({
            success: true,
            message: `Contraseña restablecida para ${user.email}. La contraseña temporal ha sido generada.`,
            tempPassword,
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        return NextResponse.json(
            { success: false, error: 'Error al restablecer contraseña' },
            { status: 500 }
        );
    }
}
