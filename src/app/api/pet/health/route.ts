import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get health records for a pet (upcoming due dates)
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
        const petId = searchParams.get('petId');

        if (!petId) {
            return NextResponse.json(
                { success: false, error: 'petId is required' },
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
                { success: false, error: 'Pet not found or not owned by user' },
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
            { success: false, error: 'Failed to fetch health records' },
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
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { petId, type, name, dueDate, notes } = body;

        if (!petId || !type || !name) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
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
                { success: false, error: 'Pet not found or not owned by user' },
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
            { success: false, error: 'Failed to create health record' },
            { status: 500 }
        );
    }
}

// PATCH - Update a health record (mark complete, edit notes)
export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const { recordId, completedAt, notes, dueDate } = body;

        if (!recordId) {
            return NextResponse.json({ success: false, error: 'recordId is required' }, { status: 400 });
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
        return NextResponse.json({ success: false, error: 'Error al actualizar registro' }, { status: 500 });
    }
}

// DELETE - Delete a health record
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const recordId = searchParams.get('recordId');

        if (!recordId) {
            return NextResponse.json({ success: false, error: 'recordId is required' }, { status: 400 });
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
        return NextResponse.json({ success: false, error: 'Error al eliminar registro' }, { status: 500 });
    }
}
