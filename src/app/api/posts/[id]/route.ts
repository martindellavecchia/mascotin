import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get single post
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
        }

        const { id } = await params;
        const post = await db.post.findUnique({
            where: { id },
            include: {
                author: {
                    select: { id: true, name: true, image: true }
                },
                pet: {
                    select: { id: true, name: true, images: true, petType: true }
                },
                _count: {
                    select: { likes: true, comments: true }
                }
            }
        });

        if (!post) {
            return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 });
        }

        return NextResponse.json({ success: true, post });
    } catch (error) {
        console.error('Error fetching post:', error);
        return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
}

// PUT - Update post
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // Check ownership
        const existingPost = await db.post.findUnique({
            where: { id },
            select: { authorId: true }
        });

        if (!existingPost) {
            return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 });
        }

        if (existingPost.authorId !== session.user.id) {
            return NextResponse.json({ success: false, error: 'Not authorized to edit this post' }, { status: 403 });
        }

        const { content, images, postType, eventDate, eventLocation } = body;

        const updatedPost = await db.post.update({
            where: { id },
            data: {
                ...(content !== undefined && { content }),
                ...(images !== undefined && { images: Array.isArray(images) ? JSON.stringify(images) : images }),
                ...(postType !== undefined && { postType }),
                ...(eventDate !== undefined && { eventDate: eventDate ? new Date(eventDate) : null }),
                ...(eventLocation !== undefined && { eventLocation }),
            }
        });

        return NextResponse.json({ success: true, post: updatedPost });
    } catch (error) {
        console.error('Error updating post:', error);
        return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
}

// DELETE - Delete post
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
        }

        const { id } = await params;

        // Check ownership
        const post = await db.post.findUnique({
            where: { id },
            select: { authorId: true }
        });

        if (!post) {
            return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 });
        }

        if (post.authorId !== session.user.id) {
            return NextResponse.json({ success: false, error: 'Not authorized to delete this post' }, { status: 403 });
        }

        await db.post.delete({ where: { id } });

        return NextResponse.json({ success: true, message: 'Post deleted' });
    } catch (error) {
        console.error('Error deleting post:', error);
        return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
}
