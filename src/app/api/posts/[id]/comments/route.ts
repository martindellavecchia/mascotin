import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const postId = params.id;

        const comments = await prisma.comment.findMany({
            where: { postId },
            orderBy: { createdAt: 'asc' },
            include: {
                author: {
                    select: {
                        name: true,
                        image: true,
                        owner: {
                            select: {
                                image: true,
                            }
                        }
                    }
                }
            }
        });

        // Transform to use owner image as fallback
        const formattedComments = comments.map(comment => {
            const author = comment.author as typeof comment.author & { owner?: { image: string | null } };
            return {
                ...comment,
                author: {
                    name: author.name,
                    image: author.image || author.owner?.image || null,
                },
            };
        });

        return NextResponse.json({ success: true, comments: formattedComments });
    } catch (error) {
        console.error('Error fetching comments:', error);
        return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
        }

        const { content } = await req.json();
        const postId = params.id;

        if (!content || typeof content !== 'string') {
            return NextResponse.json({ success: false, error: 'El contenido es requerido' }, { status: 400 });
        }

        if (content.length > 2000) {
            return NextResponse.json({ success: false, error: 'El comentario no puede exceder 2000 caracteres' }, { status: 400 });
        }

        const comment = await prisma.comment.create({
            data: {
                postId,
                authorId: session.user.id,
                content,
            },
            include: {
                author: {
                    select: {
                        name: true,
                        image: true
                    }
                }
            }
        });

        // Notify post author
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { authorId: true },
        });
        if (post) {
            createNotification({
                userId: post.authorId,
                actorId: session.user.id,
                type: 'COMMENT',
                title: 'Nuevo comentario',
                body: `${session.user.name || 'Alguien'} comentó en tu publicación`,
                link: '/community',
                entityId: postId,
            }).catch(console.error);
        }

        return NextResponse.json({ success: true, comment });
    } catch (error) {
        console.error('Error creating comment:', error);
        return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
}
