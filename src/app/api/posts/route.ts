import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db as prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createPostSchema } from '@/lib/schemas';

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

        const where: Prisma.PostWhereInput = {};
        if (petId) where.petId = petId;

        const posts = await prisma.post.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit + 1, // Fetch one extra to check if there's more
            ...(cursor && {
                cursor: { id: cursor },
                skip: 1, // Skip the cursor itself
            }),
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        owner: {
                            select: {
                                image: true,
                            }
                        }
                    }
                },
                pet: {
                    select: {
                        id: true,
                        name: true,
                        images: true,
                        breed: true,
                        petType: true,
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                    }
                },
                likes: {
                    where: {
                        userId: session.user.id
                    },
                    select: {
                        userId: true
                    }
                },
                event: {
                    select: {
                        id: true,
                        attendees: {
                            where: { userId: session.user.id },
                            select: { id: true }
                        }
                    }
                }
            }
        });

        // Check if there are more posts
        let nextCursor: string | null = null;
        if (posts.length > limit) {
            const nextItem = posts.pop(); // Remove the extra item
            nextCursor = nextItem!.id;
        }

        // Transform to add isLiked, isAttending, and resolve author image
        const formattedPosts = posts.map(post => {
            // Use owner image as fallback if user doesn't have one
            const author = post.author as typeof post.author & { owner?: { image: string | null } };
            const authorImage = author?.image || author?.owner?.image || null;

            return {
                ...post,
                author: {
                    ...post.author,
                    image: authorImage,
                    owner: undefined, // Remove nested owner from response
                },
                isLiked: post.likes.length > 0,
                likes: undefined, // Remove raw likes array
                isAttending: post.event ? post.event.attendees.length > 0 : false,
                eventId: post.event?.id
            };
        });

        return NextResponse.json({
            success: true,
            posts: formattedPosts,
            nextCursor,
            hasMore: nextCursor !== null
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
