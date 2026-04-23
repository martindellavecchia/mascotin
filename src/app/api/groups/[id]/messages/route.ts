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
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const rawAfter = searchParams.get('after');
        const after = parseMessageCursor(rawAfter);
        const limit = clampMessageLimit(searchParams.get('limit'));

        if (rawAfter && !after) {
            return NextResponse.json(
                { success: false, error: 'after must be a valid ISO date' },
                { status: 400 }
            );
        }

        // Verify user is a member of this group
        const membership = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId: params.id, userId: session.user.id } }
        });

        if (!membership) {
            return NextResponse.json({ success: false, error: 'No eres miembro de este grupo' }, { status: 403 });
        }

        const messages = await prisma.message.findMany({
            where: {
                groupId: params.id,
                ...(after ? { createdAt: { gt: after } } : {}),
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

        return NextResponse.json({ success: true, ...page });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error fetching messages' }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { content } = await req.json();

        // Verify membership? For now assume valid member if allowed to post in UI
        const member = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId: params.id, userId: session.user.id } }
        });

        if (!member) {
            return NextResponse.json({ success: false, error: 'Not a member' }, { status: 403 });
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
        return NextResponse.json({ success: false, error: 'Error sending message' }, { status: 500 });
    }
}
