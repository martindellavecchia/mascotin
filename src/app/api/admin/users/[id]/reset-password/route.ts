import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminWrite } from '@/lib/admin';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// POST - Reset user password (generate temporary password)
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const authError = await requireAdminWrite(request);
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

        // Send temporary password via email if configured, never in the response
        const hasEmailProvider = Boolean(process.env.RESEND_API_KEY);
        if (hasEmailProvider) {
            const { sendEmail } = await import('@/lib/email');
            await sendEmail({
                to: user.email,
                subject: 'mascoTin - Contraseña temporal',
                html: `<p>Tu contraseña ha sido restablecida por un administrador.</p><p>Tu contraseña temporal es: <strong>${tempPassword}</strong></p><p>Por favor, cámbiala lo antes posible.</p>`,
            });
        }

        return NextResponse.json({
            success: true,
            message: hasEmailProvider
                ? `Contraseña restablecida. Se envió la contraseña temporal al email ${user.email}.`
                : `Contraseña restablecida para ${user.email}. La contraseña temporal ha sido generada. Configura RESEND_API_KEY para enviarla por email.`,
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        return NextResponse.json(
            { success: false, error: 'Error al restablecer contraseña' },
            { status: 500 }
        );
    }
}
