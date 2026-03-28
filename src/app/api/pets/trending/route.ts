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

        // Get trending pets (most matches/likes, excluding user's own pets)
        const owner = await db.owner.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
        });

        const ownPetIds = owner
            ? (await db.pet.findMany({ where: { ownerId: owner.id }, select: { id: true } })).map(p => p.id)
            : [];

        // Get pets ordered by total matches (popularity)
        const trendingPets = await db.pet.findMany({
            where: {
                isActive: true,
                id: { notIn: ownPetIds },
            },
            orderBy: [
                { totalMatches: 'desc' },
                { level: 'desc' },
            ],
            take: 6,
            include: { owner: true },
        });

        return NextResponse.json({
            success: true,
            pets: trendingPets,
        }, {
            headers: {
                'Cache-Control': 'public, max-age=300, s-maxage=600',
            },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to fetch trending pets' },
            { status: 500 }
        );
    }
}
