import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db as prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// PUT - Update an event
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const { title, description, date, location } = body;

        const event = await prisma.event.findUnique({
            where: { id: params.id },
            include: { group: { include: { members: true } } }
        });

        if (!event) return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });

        let isAuthorized = false;
        if (event.authorId === session.user.id) isAuthorized = true;
        else if (event.groupId) {
            const membership = await prisma.groupMember.findUnique({
                where: { groupId_userId: { groupId: event.groupId, userId: session.user.id } }
            });
            if (membership?.role === 'ADMIN') isAuthorized = true;
        }

        if (!isAuthorized) return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });

        const updatedEvent = await prisma.event.update({
            where: { id: params.id },
            data: {
                title,
                description,
                date: new Date(date),
                location
            }
        });

        return NextResponse.json({ success: true, event: updatedEvent });
    } catch (error) {
        console.error('Error updating event:', error);
        return NextResponse.json({ success: false, error: 'Failed to update event' }, { status: 500 });
    }
}

// DELETE - Remove an event
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const event = await prisma.event.findUnique({
            where: { id: params.id },
            include: { group: { include: { members: true } } }
        });

        if (!event) {
            return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
        }

        let isAuthorized = false;

        // 1. Author can delete
        if (event.authorId === session.user.id) {
            isAuthorized = true;
        }
        // 2. Group Admin can delete (if event is in group)
        else if (event.groupId) {
            const membership = await prisma.groupMember.findUnique({
                where: {
                    groupId_userId: {
                        groupId: event.groupId,
                        userId: session.user.id
                    }
                }
            });
            if (membership?.role === 'ADMIN') {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
        }

        await prisma.event.delete({ where: { id: params.id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting event:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete event' },
            { status: 500 }
        );
    }
}
