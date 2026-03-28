import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createEventSchema } from '@/lib/schemas';

// GET - List upcoming events
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const groupId = searchParams.get('groupId');
        const limit = searchParams.get('limit');
        const action = searchParams.get('action'); // 'all' to see past events
        const take = limit ? parseInt(limit) : 20;

        const where: Prisma.EventWhereInput = {};

        // Only filter by date if NOT asking for all (default behavior is upcoming only)
        if (action !== 'all') {
            where.date = {
                gte: new Date(),
            };
        }

        if (groupId) {
            where.groupId = groupId;
        }

        // Filter out dismissed events
        where.dismissals = {
            none: {
                userId: session.user.id
            }
        };

        const events = await db.event.findMany({
            where,
            orderBy: {
                date: 'asc',
            },
            take,
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
                _count: {
                    select: {
                        attendees: true,
                    },
                },
                attendees: {
                    where: {
                        userId: session.user.id,
                    },
                    select: {
                        id: true,
                    },
                },
                group: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            },
        });

        // Add isAttending flag
        const eventsWithFlag = events.map(event => ({
            ...event,
            isAttending: event.attendees.length > 0,
            attendeesCount: event._count.attendees,
        }));

        return NextResponse.json({
            success: true,
            events: eventsWithFlag,
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch events' },
            { status: 500 }
        );
    }
}

// POST - Create an event
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const parsed = createEventSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Datos inválidos', details: parsed.error.issues },
                { status: 400 }
            );
        }
        const { title, description, date, location, image, maxAttendees, groupId } = parsed.data;

        const event = await db.event.create({
            data: {
                authorId: session.user.id,
                title,
                description,
                date: new Date(date),
                location,
                image,
                maxAttendees,
                groupId: groupId || null,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            event,
        });
    } catch (error) {
        console.error('Error creating event:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create event' },
            { status: 500 }
        );
    }
}
