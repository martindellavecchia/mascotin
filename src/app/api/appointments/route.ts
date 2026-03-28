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

        // Check for conflicting appointment in same time slot (±duration)
        const service = await db.service.findUnique({ where: { id: serviceId } });
        if (!service) {
            return NextResponse.json({ success: false, error: 'Servicio no encontrado' }, { status: 404 });
        }
        const appointmentDate = new Date(date);
        const slotEnd = new Date(appointmentDate.getTime() + service.duration * 60000);
        const conflict = await db.appointment.findFirst({
            where: {
                serviceId,
                status: { in: ['PENDING', 'CONFIRMED'] },
                date: { gte: appointmentDate, lt: slotEnd },
            },
        });
        if (conflict) {
            return NextResponse.json({ success: false, error: 'Ya existe una cita en ese horario' }, { status: 409 });
        }

        const appointment = await db.appointment.create({
            data: {
                userId: session.user.id,
                serviceId,
                petId,
                date: appointmentDate,
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
