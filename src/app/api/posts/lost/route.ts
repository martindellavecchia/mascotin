import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { withImageFields } from '@/lib/media';

async function viewerHidesResolved() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return false;
    const settings = await db.userSettings.findUnique({
        where: { userId: session.user.id },
        select: { hideResolvedLostPets: true },
    });
    return settings?.hideResolvedLostPets ?? false;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const cursor = searchParams.get('cursor');
        const type = searchParams.get('type');
        const resolved = searchParams.get('resolved');

        const postType =
            type === 'found_pet' ? 'found_pet' : type === 'lost_pet' ? 'lost_pet' : undefined;
        const includeResolved = resolved === 'all' && !(await viewerHidesResolved());

        const lostPets = await db.post.findMany({
            where: {
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
            include: {
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
