import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db as prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        // Verify user is a member of this group
        const membership = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId: params.id, userId: session.user.id } }
        });

        if (!membership) {
            return NextResponse.json({ success: false, error: 'No eres miembro de este grupo' }, { status: 403 });
        }

        const members = await prisma.groupMember.findMany({
            where: { groupId: params.id },
            include: { user: true },
            orderBy: { role: 'asc' }
        });

        return NextResponse.json({ success: true, members });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error al obtener miembros' }, { status: 500 });
    }
}
