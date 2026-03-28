import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Get owner
        const owner = await db.owner.findUnique({
            where: { userId: session.user.id },
        });

        if (!owner) {
            return NextResponse.json({
                success: true,
                stats: {
                    totalPets: 0,
                    totalMatches: 0,
                    totalSwipes: 0,
                    likesReceived: 0,
                },
            });
        }

        // Get pets for this owner
        const pets = await db.pet.findMany({
            where: { ownerId: owner.id },
            select: { id: true },
        });
        const petIds = pets.map(p => p.id);

        // Get matches count
        const matchesCount = await db.match.count({
            where: {
                OR: [
                    { pet1Id: { in: petIds } },
                    { pet2Id: { in: petIds } },
                ],
            },
        });

        // Get swipes sent
        const swipesSent = await db.swipe.count({
            where: { fromPetId: { in: petIds } },
        });

        // Get likes received
        const likesReceived = await db.swipe.count({
            where: {
                toPetId: { in: petIds },
                isLike: true,
            },
        });

        return NextResponse.json({
            success: true,
            stats: {
                totalPets: pets.length,
                totalMatches: matchesCount,
                totalSwipes: swipesSent,
                likesReceived,
            },
        }, {
            headers: {
                'Cache-Control': 'private, max-age=60',
            },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
