import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteAccountSchema } from '@/lib/schemas';
import bcrypt from 'bcryptjs';

export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = deleteAccountSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: 'Datos inválidos', details: parsed.error.issues }, { status: 400 });
        }

        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { password: true, role: true },
        });

        if (!user?.password) {
            return NextResponse.json({ success: false, error: 'Tu cuenta no tiene contraseña configurada' }, { status: 400 });
        }

        if (user.role === 'ADMIN') {
            return NextResponse.json({ success: false, error: 'No se puede eliminar una cuenta de administrador' }, { status: 400 });
        }

        const isValid = await bcrypt.compare(parsed.data.password, user.password);
        if (!isValid) {
            return NextResponse.json({ success: false, error: 'La contraseña es incorrecta' }, { status: 400 });
        }

        await db.user.delete({ where: { id: session.user.id } });

        return NextResponse.json({ success: true, message: 'Cuenta eliminada correctamente' });
    } catch (error) {
        console.error('Error deleting account:', error);
        return NextResponse.json({ success: false, error: 'Error al eliminar cuenta' }, { status: 500 });
    }
}
