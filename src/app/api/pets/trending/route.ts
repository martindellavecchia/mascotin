import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { VISIBLE_PROFILE_USER_FILTER } from '@/lib/server/profile-visibility';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Iniciá sesión para continuar' },
                { status: 401 }
            );
        }

        // Get trending pets (most matches/likes, excluding user's own pets)
        const [owner, viewer] = await Promise.all([
            db.owner.findUnique({ where: { userId: session.user.id }, select: { id: true } }),
            db.user.findUnique({ where: { id: session.user.id }, select: { syntheticRunId: true } }),
        ]);

        const ownPetIds = owner
            ? (await db.pet.findMany({ where: { ownerId: owner.id }, select: { id: true } })).map(p => p.id)
            : [];

        // Get pets ordered by total matches (popularity)
        const trendingPets = await db.pet.findMany({
            where: {
                isActive: true,
                id: { notIn: ownPetIds },
                owner: {
                    user: { syntheticRunId: viewer?.syntheticRunId || null, ...VISIBLE_PROFILE_USER_FILTER },
                },
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
                'Cache-Control': 'private, max-age=300',
            },
        });
    } catch {
        return NextResponse.json(
            { success: false, error: 'No pudimos cargar las mascotas destacadas. Intentá de nuevo.' },
            { status: 500 }
        );
    }
}
