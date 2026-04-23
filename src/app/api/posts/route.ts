import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db as prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createPostSchema } from '@/lib/schemas';
import { getFeedPage } from '@/lib/server/feed';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const petId = searchParams.get('petId');
        const limit = parseInt(searchParams.get('limit') || '10');
        const cursor = searchParams.get('cursor'); // Post ID for cursor-based pagination

        const feedPage = await getFeedPage({
            userId: session.user.id,
            petId,
            limit,
            cursor,
        });

        return NextResponse.json({
            success: true,
            ...feedPage,
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener publicaciones' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = createPostSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Datos inválidos', details: parsed.error.issues },
                { status: 400 }
            );
        }
        const { content, petId, images, location, postType, eventDate, eventLocation, contactPhone, lastSeenLocation } = parsed.data;

        const imagesJson = images ? JSON.stringify(images) : '[]';

        // Create Event + Post in a transaction to prevent orphaned events
        const post = await prisma.$transaction(async (tx) => {
            let eventId: string | undefined;

            if (postType === 'event' && eventDate && eventLocation) {
                const title = content.split('\n')[0].substring(0, 50);

                const event = await tx.event.create({
                    data: {
                        title: title,
                        description: content,
                        date: new Date(eventDate),
                        location: eventLocation,
                        image: images && images.length > 0 ? images[0] : null,
                        authorId: session.user.id,
                    }
                });
                eventId = event.id;
            }

            return tx.post.create({
                data: {
                    authorId: session.user.id,
                    petId: petId || undefined,
                    postType: postType || 'post',
                    content,
                    images: imagesJson,
                    location,
                    eventDate: eventDate ? new Date(eventDate) : undefined,
                    eventLocation: eventLocation || undefined,
                    eventId: eventId,
                    contactPhone: contactPhone || undefined,
                    lastSeenLocation: lastSeenLocation || undefined,
                },
                include: {
                    author: {
                        select: {
                            name: true,
                            image: true
                        }
                    },
                    pet: {
                        select: {
                            name: true,
                            images: true
                        }
                    }
                }
            });
        });

        return NextResponse.json({ success: true, post });
    } catch (error) {
        console.error('Error creating post:', error);
        return NextResponse.json({ success: false, error: 'Error al crear publicación' }, { status: 500 });
    }
}
