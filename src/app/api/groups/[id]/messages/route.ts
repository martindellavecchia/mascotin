import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db as prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import {
    buildMessagePage,
    clampMessageLimit,
    parseMessageCursor,
} from '@/lib/messages';
import { createNotificationBulk } from '@/lib/notifications';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const rawAfter = searchParams.get('after');
        const rawBefore = searchParams.get('before');
        const after = parseMessageCursor(rawAfter);
        const before = parseMessageCursor(rawBefore);
        const limit = clampMessageLimit(searchParams.get('limit'));

        if ((rawAfter && !after) || (rawBefore && !before) || (after && before)) {
            return NextResponse.json(
                { success: false, error: 'La fecha indicada no es válida' },
                { status: 400 }
            );
        }

        // Verify user is a member of this group
        const membership = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId: params.id, userId: session.user.id } }
        });

        if (!membership) {
            return NextResponse.json({ success: false, error: 'No sos miembro de este grupo' }, { status: 403 });
        }

        const messages = await prisma.message.findMany({
            where: {
                groupId: params.id,
                ...(after ? { createdAt: { gt: after } } : {}),
                ...(before ? { createdAt: { lt: before } } : {}),
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
            orderBy: {
                createdAt: after ? 'asc' : 'desc',
            },
            take: after ? limit : limit + 1,
        });

        const page = buildMessagePage(messages, {
            limit,
            incremental: Boolean(after),
        });
        if (page.latestCursor && !before) {
            await prisma.groupMember.updateMany({ where: { groupId: params.id, userId: session.user.id, lastReadAt: { lt: new Date(page.latestCursor) } }, data: { lastReadAt: new Date(page.latestCursor) } });
        }

        return NextResponse.json({ success: true, ...page });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'No se pudieron cargar los mensajes' }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });

        const { content } = await req.json();

        // Verify membership? For now assume valid member if allowed to post in UI
        const member = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId: params.id, userId: session.user.id } }
        });

        if (!member) {
            return NextResponse.json({ success: false, error: 'No sos miembro de este grupo' }, { status: 403 });
        }

        const message = await prisma.message.create({
            data: {
                content,
                groupId: params.id,
                senderId: session.user.id,
                // receiverId is null/optional for group
            },
            include: {
                sender: { select: { id: true, name: true, image: true } }
            }
        });

        // Notify other group members
        const members = await prisma.groupMember.findMany({
            where: { groupId: params.id },
            select: { userId: true },
        });
        createNotificationBulk(
            members.map(m => m.userId),
            session.user.id,
            'GROUP_MESSAGE',
            'Nuevo mensaje en grupo',
            `${session.user.name || 'Alguien'} envió un mensaje`,
            `/community/groups/${params.id}`,
            message.id,
        ).catch(console.error);

        return NextResponse.json({ success: true, message });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'No se pudo enviar el mensaje' }, { status: 500 });
    }
}
