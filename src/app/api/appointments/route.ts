import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAppointmentSchema } from '@/lib/schemas';

// GET - Get user's upcoming appointments
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const appointments = await db.appointment.findMany({
            where: {
                userId: session.user.id,
                date: {
                    gte: new Date(),
                },
            },
            orderBy: {
                date: 'asc',
            },
            take: 5,
            include: {
                service: {
                    include: {
                        provider: true,
                    },
                },
                pet: {
                    select: {
                        id: true,
                        name: true,
                        images: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            appointments,
        });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch appointments' },
            { status: 500 }
        );
    }
}

// POST - Create a new appointment
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
        const parsed = createAppointmentSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Datos inválidos', details: parsed.error.issues },
                { status: 400 }
            );
        }
        const { serviceId, petId, date } = parsed.data;

        // Verify pet belongs to user
        const owner = await db.owner.findUnique({
            where: { userId: session.user.id },
            include: { pets: { select: { id: true } } },
        });

        if (!owner || !owner.pets.some(p => p.id === petId)) {
            return NextResponse.json(
                { success: false, error: 'Pet not found or not owned by user' },
                { status: 403 }
            );
        }

        const appointment = await db.appointment.create({
            data: {
                userId: session.user.id,
                serviceId,
                petId,
                date: new Date(date),
                status: 'PENDING',
            },
            include: {
                service: {
                    include: { provider: true },
                },
                pet: true,
            },
        });

        return NextResponse.json({
            success: true,
            appointment,
        });
    } catch (error) {
        console.error('Error creating appointment:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create appointment' },
            { status: 500 }
        );
    }
}
