import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { db } from '@/lib/db';
import { withImageFields } from '@/lib/media';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

async function viewerHidesResolved(userId: string) {
    const settings = await db.userSettings.findUnique({
        where: { userId },
        select: { hideResolvedLostPets: true },
    });
    return settings?.hideResolvedLostPets ?? false;
}

export async function GET(request: Request) {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    try {
        const { searchParams } = new URL(request.url);
        const requestedLimit = parseInt(searchParams.get('limit') || '', 10);
        const limit = requestedLimit > 0 ? Math.min(requestedLimit, MAX_LIMIT) : DEFAULT_LIMIT;
        const cursor = searchParams.get('cursor');
        const type = searchParams.get('type');
        const resolved = searchParams.get('resolved');

        const postType =
            type === 'found_pet' ? 'found_pet' : type === 'lost_pet' ? 'lost_pet' : undefined;
        const includeResolved = resolved === 'all' && !(await viewerHidesResolved(auth.session.user.id));

        const lostPets = await db.post.findMany({
            where: {
                isVisible: true,
                postType: postType ? postType : { in: ['lost_pet', 'found_pet'] },
                ...(resolved === 'true'
                    ? { isResolved: true }
                    : includeResolved
                      ? {}
                      : { isResolved: false }),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            select: {
                id: true,
                content: true,
                postType: true,
                images: true,
                lastSeenLocation: true,
                isResolved: true,
                createdAt: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
                pet: {
                    select: {
                        id: true,
                        name: true,
                        images: true,
                        thumbnailIndex: true,
                        petType: true,
                        breed: true,
                    },
                },
                _count: {
                    select: { sightings: true, comments: true },
                },
            },
        });

        const nextCursor = lostPets.length === limit ? lostPets[lostPets.length - 1].id : null;

        const normalizedLostPets = lostPets.map((lostPet) => ({
            ...withImageFields(lostPet),
            pet: lostPet.pet ? withImageFields(lostPet.pet) : null,
        }));

        return NextResponse.json({
            success: true,
            lostPets: normalizedLostPets,
            nextCursor,
        });
    } catch (error) {
        console.error('Error fetching lost pets:', error);
        return NextResponse.json(
            { success: false, error: 'No se pudieron cargar las alertas' },
            { status: 500 }
        );
    }
}
