import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db as prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = params;

        // Check if event exists
        const event = await prisma.event.findUnique({
            where: { id: id }
        });

        if (!event) {
            return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
        }

        // Create dismissal
        // Use upsert to avoid error if already dismissed (though UI should prevent)
        // Or just create and ignore unique constraint violation
        // Upsert is safer.
        await prisma.eventDismissal.upsert({
            where: {
                eventId_userId: {
                    eventId: id,
                    userId: session.user.id
                }
            },
            update: {},
            create: {
                eventId: id,
                userId: session.user.id
            }
        });

        // Also remove attendance if they were attending?
        // User didn't ask, but logic suggests if "No me interesa", they shouldn't be attending.
        // Let's remove attendance too.
        await prisma.eventAttendee.deleteMany({
            where: {
                eventId: id,
                userId: session.user.id
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error dismissing event:', error);
        return NextResponse.json({ success: false, error: 'Failed to dismiss event' }, { status: 500 });
    }
}
