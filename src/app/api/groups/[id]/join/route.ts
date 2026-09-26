import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db as prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { createNotificationBulk } from '@/lib/notifications';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });

        const existingMember = await prisma.groupMember.findUnique({
            where: {
                groupId_userId: {
                    groupId: params.id,
                    userId: session.user.id,
                },
            },
        });

        if (existingMember) {
            return NextResponse.json({ success: false, error: 'Ya sos miembro de este grupo' }, { status: 400 });
        }

        await prisma.groupMember.create({
            data: {
                groupId: params.id,
                userId: session.user.id,
            },
        });

        // Notify group admins
        const [admins, group] = await Promise.all([
            prisma.groupMember.findMany({
                where: { groupId: params.id, role: 'ADMIN' },
                select: { userId: true },
            }),
            prisma.group.findUnique({
                where: { id: params.id },
                select: { name: true, creatorId: true },
            }),
        ]);
        const adminIds = [...new Set([
            ...admins.map(a => a.userId),
            ...(group ? [group.creatorId] : []),
        ])];
        createNotificationBulk(
            adminIds,
            session.user.id,
            'GROUP_JOIN',
            'Nuevo miembro',
            `${session.user.name || 'Alguien'} se unió a "${group?.name || 'tu grupo'}"`,
            `/community/groups/${params.id}`,
            params.id,
        ).catch(console.error);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'No pudimos sumarte al grupo' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });

        const group = await prisma.group.findUnique({ where: { id: params.id } });
        if (!group) return NextResponse.json({ success: false, error: 'Grupo no encontrado' }, { status: 404 });

        if (group.creatorId === session.user.id) {
            return NextResponse.json({ success: false, error: 'Quien creó el grupo no puede abandonarlo. Si querés, podés eliminarlo.' }, { status: 400 });
        }

        await prisma.groupMember.delete({
            where: {
                groupId_userId: {
                    groupId: params.id,
                    userId: session.user.id,
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'No se pudo abandonar el grupo' }, { status: 500 });
    }
}
