import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
        const currentPetId = searchParams.get('petId');

        // Get current user's owner profile and pets
        const owner = await db.owner.findUnique({
            where: { userId: session.user.id },
            include: {
                pets: {
                    select: { id: true, petType: true, breed: true },
                },
            },
        });

        if (!owner || owner.pets.length === 0) {
            return NextResponse.json({
                success: true,
                suggestions: [],
            });
        }

        // Get the current pet (or first pet if none selected)
        const currentPet = currentPetId
            ? owner.pets.find(p => p.id === currentPetId) || owner.pets[0]
            : owner.pets[0];

        // Get all user's pet IDs to exclude
        const myPetIds = owner.pets.map(p => p.id);

        // Get pets already swiped by current pet
        const swipedPets = await db.swipe.findMany({
            where: { fromPetId: currentPet.id },
            select: { toPetId: true },
        });
        const swipedPetIds = swipedPets.map(s => s.toPetId).filter(Boolean) as string[];

        // Get blocked user IDs (both directions)
        const blockedRelations = await db.blockedUser.findMany({
            where: {
                OR: [
                    { blockerId: session.user.id },
                    { blockedId: session.user.id },
                ],
            },
            select: { blockerId: true, blockedId: true },
        });
        const blockedUserIds = blockedRelations.map(b =>
            b.blockerId === session.user.id ? b.blockedId : b.blockerId
        );

        // Get all other pets with their owner info
        const otherPets = await db.pet.findMany({
            where: {
                id: {
                    notIn: [...myPetIds, ...swipedPetIds],
                },
                // Exclude pets from blocked users
                ...(blockedUserIds.length > 0 && {
                    owner: {
                        userId: { notIn: blockedUserIds },
                    },
                }),
            },
            include: {
                owner: {
                    select: {
                        location: true,
                        bio: true,
                    },
                },
            },
            take: 20,
        });

        // Score and rank pets
        const scoredPets = otherPets.map(pet => {
            let score = 0;
            const reasons: string[] = [];

            // Same pet type: +5 pts
            if (pet.petType === currentPet.petType) {
                score += 5;
                reasons.push('Mismo tipo');
            }

            // Same breed: +3 pts
            if (pet.breed && currentPet.breed && pet.breed.toLowerCase() === currentPet.breed.toLowerCase()) {
                score += 3;
                reasons.push('Misma raza');
            }

            // Same location: +2 pts
            if (pet.owner?.location && owner.location &&
                pet.owner.location.toLowerCase().includes(owner.location.split(',')[0].toLowerCase())) {
                score += 2;
                reasons.push('Misma zona');
            }

            // Parse owner interests from bio (simple keyword matching)
            if (pet.owner?.bio && owner.bio) {
                const petOwnerInterests = pet.owner.bio.toLowerCase().split(/[\s,]+/);
                const myInterests = owner.bio.toLowerCase().split(/[\s,]+/);
                const commonInterests = petOwnerInterests.filter(i =>
                    myInterests.includes(i) && i.length > 3
                );
                if (commonInterests.length > 0) {
                    score += commonInterests.length;
                    reasons.push('Intereses comunes');
                }
            }

            // Get first image
            let image = null;
            try {
                const images = JSON.parse(pet.images || '[]');
                image = images[0] || null;
            } catch {
                image = null;
            }

            return {
                id: pet.id,
                name: pet.name,
                petType: pet.petType,
                breed: pet.breed,
                image,
                matchScore: score,
                matchReason: reasons.length > 0 ? reasons.join(' • ') : 'Nuevo amigo',
            };
        });

        // Sort by score descending and take top 5
        const suggestions = scoredPets
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 5);

        return NextResponse.json({
            success: true,
            suggestions,
        }, {
            headers: {
                'Cache-Control': 'private, max-age=120',
            },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to fetch suggestions' },
            { status: 500 }
        );
    }
}
