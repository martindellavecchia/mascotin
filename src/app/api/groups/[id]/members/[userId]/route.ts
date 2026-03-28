import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db as prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: { id: string, userId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    try {
        const { id: groupId, userId: targetUserId } = params;

        // Verify requester is ADMIN of the group
        const requesterMembership = await prisma.groupMember.findUnique({
            where: {
                groupId_userId: {
                    groupId,
                    userId: session.user.id,
                },
            },
        });

        if (requesterMembership?.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'No tienes permisos para eliminar miembros' }, { status: 403 });
        }

        if (targetUserId === session.user.id) {
            return NextResponse.json({ success: false, error: 'No puedes eliminarte a ti mismo por esta vía' }, { status: 400 });
        }

        // Delete the membership
        await prisma.groupMember.delete({
            where: {
                groupId_userId: {
                    groupId,
                    userId: targetUserId,
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error al eliminar miembro' }, { status: 500 });
    }
}
