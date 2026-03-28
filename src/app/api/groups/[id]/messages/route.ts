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

        const messages = await prisma.message.findMany({
            where: {
                groupId: params.id,
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
                createdAt: 'asc',
            },
        });

        return NextResponse.json({ success: true, messages });
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

        return NextResponse.json({ success: true, message });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error sending message' }, { status: 500 });
    }
}
