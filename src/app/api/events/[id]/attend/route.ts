import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST - Toggle attendance for an event
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const eventId = params.id;

        // Check if already attending
        const existing = await db.eventAttendee.findUnique({
            where: {
                eventId_userId: {
                    eventId,
                    userId: session.user.id,
                },
            },
        });

        if (existing) {
            // Remove attendance
            await db.eventAttendee.delete({
                where: { id: existing.id },
            });
            return NextResponse.json({
                success: true,
                attending: false,
            });
        } else {
            // Add attendance
            await db.eventAttendee.create({
                data: {
                    eventId,
                    userId: session.user.id,
                },
            });
            return NextResponse.json({
                success: true,
                attending: true,
            });
        }
    } catch (error) {
        console.error('Error toggling attendance:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update attendance' },
            { status: 500 }
        );
    }
}
