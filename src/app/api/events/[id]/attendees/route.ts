import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db as prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = params;

        // Fetch event to check permissions
        const event = await prisma.event.findUnique({
            where: { id },
            include: { group: true }
        });

        if (!event) {
            return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
        }

        // Check if user is Author or Group Creator
        const isAuthor = event.authorId === session.user.id;
        let isGroupAdmin = false;

        if (event.groupId) {
            const group = await prisma.group.findUnique({
                where: { id: event.groupId },
                select: { creatorId: true }
            });
            if (group && group.creatorId === session.user.id) {
                isGroupAdmin = true;
            }
        }

        if (!isAuthor && !isGroupAdmin) {
            return NextResponse.json({ success: false, error: 'Unauthorized to view attendee details' }, { status: 403 });
        }

        // Fetch attendees
        const attendees = await prisma.eventAttendee.findMany({
            where: { eventId: id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formattedAttendees = attendees.map(record => ({
            userId: record.userId,
            name: record.user.name,
            email: record.user.email,
            image: record.user.image,
            confirmedAt: record.createdAt
        }));

        return NextResponse.json({ success: true, attendees: formattedAttendees });

    } catch (error) {
        console.error('Error fetching attendees:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
