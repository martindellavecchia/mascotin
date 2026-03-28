import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PATCH - Update appointment status (confirm, cancel, complete)
export async function PATCH(
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

        const { id } = params;
        const body = await request.json();
        const { status } = body;

        const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
        if (!status || !validStatuses.includes(status)) {
            return NextResponse.json(
                { success: false, error: 'Invalid status' },
                { status: 400 }
            );
        }

        // Get the appointment with service and provider info
        const appointment = await db.appointment.findUnique({
            where: { id },
            include: {
                service: {
                    include: { provider: true },
                },
            },
        });

        if (!appointment) {
            return NextResponse.json(
                { success: false, error: 'Appointment not found' },
                { status: 404 }
            );
        }

        // Check authorization:
        // - The client (userId) can cancel their own appointment
        // - The provider can confirm, cancel, or complete
        const isClient = appointment.userId === session.user.id;
        const isProvider = appointment.service.provider.userId === session.user.id;

        if (!isClient && !isProvider) {
            return NextResponse.json(
                { success: false, error: 'Not authorized' },
                { status: 403 }
            );
        }

        // Clients can only cancel
        if (isClient && !isProvider && status !== 'CANCELLED') {
            return NextResponse.json(
                { success: false, error: 'Clients can only cancel appointments' },
                { status: 403 }
            );
        }

        const updated = await db.appointment.update({
            where: { id },
            data: { status },
            include: {
                service: {
                    include: { provider: true },
                },
                pet: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            appointment: updated,
        });
    } catch (error) {
        console.error('Error updating appointment:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update appointment' },
            { status: 500 }
        );
    }
}

// DELETE - Cancel and remove appointment
export async function DELETE(
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

        const { id } = params;

        const appointment = await db.appointment.findUnique({
            where: { id },
            include: {
                service: {
                    include: { provider: true },
                },
            },
        });

        if (!appointment) {
            return NextResponse.json(
                { success: false, error: 'Appointment not found' },
                { status: 404 }
            );
        }

        // Only client or provider can delete
        const isClient = appointment.userId === session.user.id;
        const isProvider = appointment.service.provider.userId === session.user.id;

        if (!isClient && !isProvider) {
            return NextResponse.json(
                { success: false, error: 'Not authorized' },
                { status: 403 }
            );
        }

        await db.appointment.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
            message: 'Appointment deleted',
        });
    } catch (error) {
        console.error('Error deleting appointment:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete appointment' },
            { status: 500 }
        );
    }
}
