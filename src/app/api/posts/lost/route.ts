import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withImageFields } from '@/lib/media';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const cursor = searchParams.get('cursor');
        const type = searchParams.get('type');
        const resolved = searchParams.get('resolved');

        const postType =
            type === 'found_pet' ? 'found_pet' : type === 'lost_pet' ? 'lost_pet' : undefined;

        const lostPets = await db.post.findMany({
            where: {
                postType: postType ? postType : { in: ['lost_pet', 'found_pet'] },
                ...(resolved === 'true'
                    ? { isResolved: true }
                    : resolved === 'all'
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
            { success: false, error: 'Failed to fetch lost pets' },
            { status: 500 }
        );
    }
}
