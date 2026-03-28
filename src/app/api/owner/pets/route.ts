import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get current user's pets
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Get owner profile
        const owner = await db.owner.findUnique({
            where: { userId: session.user.id },
        });

        if (!owner) {
            return NextResponse.json({
                success: true,
                pets: [],
            });
        }

        // Get pets for this owner
        const pets = await db.pet.findMany({
            where: { ownerId: owner.id },
            select: {
                id: true,
                name: true,
                petType: true,
                breed: true,
                images: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            pets,
        });
    } catch (error) {
        console.error('Error fetching user pets:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch pets' },
            { status: 500 }
        );
    }
}
