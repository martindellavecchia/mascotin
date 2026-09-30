import { updateEventSchema } from '@/lib/schemas';
import { assertEventEditor, EventPostError } from '@/lib/server/event-posts';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db as prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// GET - Get single event
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
        }

        const event = await prisma.event.findUnique({
            where: { id: id },
            include: {
                author: { select: { id: true, name: true, image: true } },
                _count: { select: { attendees: true } },
                attendees: { where: { userId: session.user.id }, select: { id: true } },
            },
        });

        if (!event) {
            return NextResponse.json({ success: false, error: 'Evento no encontrado' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            event: {
                ...event,
                isAttending: event.attendees.length > 0,
                attendeeCount: event._count.attendees,
            },
        });
    } catch (error) {
        if (error instanceof EventPostError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        console.error('Error fetching event:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener evento' }, { status: 500 });
    }
}

// PUT - Update an event
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
        }

        const parsed = updateEventSchema.safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos inválidos', details: parsed.error.issues }, { status: 400 });
        const updatedEvent = await prisma.$transaction(async (tx) => {
            const event = await tx.event.findUnique({ where: { id } });
            if (!event) throw new EventPostError('Evento no encontrado', 404);
            await assertEventEditor(tx, event, session.user.id);
            const { date, ...data } = parsed.data;
            return tx.event.update({ where: { id }, data: { ...data, ...(date !== undefined ? { date: new Date(date) } : {}) } });
        });

        return NextResponse.json({ success: true, event: updatedEvent });
    } catch (error) {
        if (error instanceof EventPostError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        console.error('Error updating event:', error);
        return NextResponse.json({ success: false, error: 'No se pudo actualizar el evento' }, { status: 500 });
    }
}

// DELETE - Remove an event
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'No autenticado' },
                { status: 401 }
            );
        }

        await prisma.$transaction(async (tx) => {
            const event = await tx.event.findUnique({ where: { id } });
            if (!event) throw new EventPostError('Evento no encontrado', 404);
            await assertEventEditor(tx, event, session.user.id);
            await tx.post.updateMany({ where: { eventId: id }, data: { eventId: null, eventDate: null, eventLocation: null, postType: 'post' } });
            await tx.event.delete({ where: { id } });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof EventPostError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        console.error('Error deleting event:', error);
        return NextResponse.json(
            { success: false, error: 'No se pudo eliminar el evento' },
            { status: 500 }
        );
    }
}
