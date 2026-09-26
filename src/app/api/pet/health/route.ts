import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const HEALTH_RECORD_TYPES = ['VACCINE', 'CHECKUP', 'MEDICATION'];

// GET - Get health records for a pet (upcoming due dates)
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Iniciá sesión para continuar' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const petId = searchParams.get('petId');

        if (!petId) {
            return NextResponse.json(
                { success: false, error: 'Indicá la mascota' },
                { status: 400 }
            );
        }

        // Verify pet belongs to user
        const owner = await db.owner.findUnique({
            where: { userId: session.user.id },
            include: { pets: { select: { id: true } } },
        });

        if (!owner || !owner.pets.some(p => p.id === petId)) {
            return NextResponse.json(
                { success: false, error: 'No encontramos esa mascota entre las tuyas' },
                { status: 403 }
            );
        }

        const healthRecords = await db.petHealthRecord.findMany({
            where: {
                petId,
                completedAt: null, // Only pending records
                dueDate: {
                    gte: new Date(), // Future due dates
                },
            },
            orderBy: {
                dueDate: 'asc',
            },
            take: 5,
        });

        return NextResponse.json({
            success: true,
            healthRecords,
        });
    } catch (error) {
        console.error('Error fetching health records:', error);
        return NextResponse.json(
            { success: false, error: 'No pudimos cargar los registros de salud. Intentá de nuevo.' },
            { status: 500 }
        );
    }
}

// POST - Create a health record
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Iniciá sesión para continuar' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { petId, type, dueDate } = body;
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 500) : null;

        if (!petId || !type || !name) {
            return NextResponse.json(
                { success: false, error: 'Completá la mascota, el tipo y el nombre del registro' },
                { status: 400 }
            );
        }

        if (!HEALTH_RECORD_TYPES.includes(type)) {
            return NextResponse.json({ success: false, error: 'Elegí un tipo de registro válido' }, { status: 400 });
        }

        if (name.length > 80) {
            return NextResponse.json({ success: false, error: 'El nombre puede tener hasta 80 caracteres' }, { status: 400 });
        }

        if (dueDate && Number.isNaN(new Date(dueDate).getTime())) {
            return NextResponse.json({ success: false, error: 'La fecha no es válida' }, { status: 400 });
        }

        // Verify pet belongs to user
        const owner = await db.owner.findUnique({
            where: { userId: session.user.id },
            include: { pets: { select: { id: true } } },
        });

        if (!owner || !owner.pets.some(p => p.id === petId)) {
            return NextResponse.json(
                { success: false, error: 'No encontramos esa mascota entre las tuyas' },
                { status: 403 }
            );
        }

        const healthRecord = await db.petHealthRecord.create({
            data: {
                petId,
                type,
                name,
                dueDate: dueDate ? new Date(dueDate) : null,
                notes,
            },
        });

        return NextResponse.json({
            success: true,
            healthRecord,
        });
    } catch (error) {
        console.error('Error creating health record:', error);
        return NextResponse.json(
            { success: false, error: 'No pudimos guardar el registro de salud. Intentá de nuevo.' },
            { status: 500 }
        );
    }
}

// PATCH - Update a health record (mark complete, edit notes)
export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Iniciá sesión para continuar' }, { status: 401 });
        }

        const body = await request.json();
        const { recordId, completedAt, notes, dueDate } = body;

        if (!recordId) {
            return NextResponse.json({ success: false, error: 'Indicá el registro' }, { status: 400 });
        }

        const record = await db.petHealthRecord.findUnique({
            where: { id: recordId },
            include: { pet: { include: { owner: true } } },
        });

        if (!record || record.pet.owner.userId !== session.user.id) {
            return NextResponse.json({ success: false, error: 'Registro no encontrado' }, { status: 404 });
        }

        const data: Record<string, unknown> = {};
        if (completedAt !== undefined) data.completedAt = completedAt ? new Date(completedAt) : null;
        if (notes !== undefined) data.notes = notes;
        if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

        const updated = await db.petHealthRecord.update({ where: { id: recordId }, data });

        return NextResponse.json({ success: true, healthRecord: updated });
    } catch (error) {
        console.error('Error updating health record:', error);
        return NextResponse.json({ success: false, error: 'No pudimos actualizar el registro. Intentá de nuevo.' }, { status: 500 });
    }
}

// DELETE - Delete a health record
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Iniciá sesión para continuar' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const recordId = searchParams.get('recordId');

        if (!recordId) {
            return NextResponse.json({ success: false, error: 'Indicá el registro' }, { status: 400 });
        }

        const record = await db.petHealthRecord.findUnique({
            where: { id: recordId },
            include: { pet: { include: { owner: true } } },
        });

        if (!record || record.pet.owner.userId !== session.user.id) {
            return NextResponse.json({ success: false, error: 'Registro no encontrado' }, { status: 404 });
        }

        await db.petHealthRecord.delete({ where: { id: recordId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting health record:', error);
        return NextResponse.json({ success: false, error: 'No pudimos eliminar el registro. Intentá de nuevo.' }, { status: 500 });
    }
}
