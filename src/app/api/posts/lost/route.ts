import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get active lost pet posts for widget
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '5');

        const lostPets = await db.post.findMany({
            where: {
                postType: 'lost_pet',
                isResolved: false,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
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
                        petType: true,
                        breed: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            lostPets,
            total: lostPets.length,
        });
    } catch (error) {
        console.error('Error fetching lost pets:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch lost pets' },
            { status: 500 }
        );
    }
}
