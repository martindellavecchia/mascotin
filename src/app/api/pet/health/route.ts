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
