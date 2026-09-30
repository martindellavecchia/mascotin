import { createGroupPostSchema } from '@/lib/schemas';
import { linkedEventSelect, withEventDetails } from '@/lib/server/event-posts';
import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
        }

        // Verify membership
        const membership = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId: id, userId: session.user.id } },
        });
        if (!membership) {
            return NextResponse.json({ success: false, error: 'No sos miembro de este grupo' }, { status: 403 });
        }

        const posts = await prisma.post.findMany({
            where: {
                groupId: id,
            },
            include: {
                event: { select: linkedEventSelect },
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                    },
                },
                likes: {
                    select: {
                        userId: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const formattedPosts = posts.map(post => ({
            ...withEventDetails(post),
            isLiked: session?.user?.id ? post.likes.some(like => like.userId === session.user.id) : false,
        }));

        return NextResponse.json({ success: true, posts: formattedPosts });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'No se pudieron cargar las publicaciones del grupo' }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
        }

        const parsed = createGroupPostSchema.safeParse(await req.json());
        if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos inválidos', details: parsed.error.issues }, { status: 400 });
        const { content, image, postType, title, eventDate, eventLocation } = parsed.data;

        const post = await prisma.$transaction(async (tx) => {
            const event = postType === 'event' ? await tx.event.create({ data: {
                title: title!, description: content, date: new Date(eventDate!), location: eventLocation!,
                image: image || null, groupId: id, authorId: session.user.id,
            } }) : null;
            return tx.post.create({
            data: {
                content,
                images: image ? JSON.stringify([image]) : '[]',
                authorId: session.user.id,
                groupId: id,
                postType: postType || 'post',
                eventDate: eventDate ? new Date(eventDate) : undefined,
                eventLocation,
                eventId: event?.id,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                    },
                },
                likes: {
                    where: {
                        userId: session.user.id
                    }
                }
            },
        });

        });

        return NextResponse.json({ success: true, post });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: 'No se pudo crear la publicación' }, { status: 500 });
    }
}
