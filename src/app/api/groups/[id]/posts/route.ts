import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        // Verify membership
        const membership = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId: params.id, userId: session.user.id } },
        });
        if (!membership) {
            return NextResponse.json({ success: false, error: 'No eres miembro de este grupo' }, { status: 403 });
        }

        const posts = await prisma.post.findMany({
            where: {
                groupId: params.id,
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
            ...post,
            isLiked: session?.user?.id ? post.likes.some(like => like.userId === session.user.id) : false,
        }));

        return NextResponse.json({ success: true, posts: formattedPosts });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error fetching group posts' }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
        }

        const body = await req.json();
        const { content, image, postType, title, eventDate, eventLocation } = body;

        if (!content) {
            return NextResponse.json({ success: false, error: 'El contenido es requerido' }, { status: 400 });
        }

        const post = await prisma.post.create({
            data: {
                content,
                images: image ? JSON.stringify([image]) : '[]',
                authorId: session.user.id,
                groupId: params.id,
                postType: postType || 'post',
                eventDate: eventDate ? new Date(eventDate) : undefined,
                eventLocation,
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

        // Automatically create Event if postType is event
        if (postType === 'event' && title && eventDate && eventLocation) {
            await prisma.event.create({
                data: {
                    title,
                    description: content,
                    date: new Date(eventDate),
                    location: eventLocation,
                    image: image || null,
                    groupId: params.id,
                    authorId: session.user.id,
                }
            });
        }

        return NextResponse.json({ success: true, post });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: 'Error creating post' }, { status: 500 });
    }
}
