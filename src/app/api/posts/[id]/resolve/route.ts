import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PATCH - Mark lost pet post as resolved (found)
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const postId = params.id;

        // Get the post and verify ownership
        const post = await db.post.findUnique({
            where: { id: postId },
            select: { authorId: true, postType: true, isResolved: true },
        });

        if (!post) {
            return NextResponse.json(
                { success: false, error: 'Post not found' },
                { status: 404 }
            );
        }

        if (post.authorId !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Only the author can mark this as resolved' },
                { status: 403 }
            );
        }

        if (post.postType !== 'lost_pet') {
            return NextResponse.json(
                { success: false, error: 'This action is only for lost pet posts' },
                { status: 400 }
            );
        }

        // Accept explicit isResolved value from body, fallback to toggle for backward compat
        let newIsResolved: boolean;
        try {
            const body = await request.json();
            newIsResolved = typeof body.isResolved === 'boolean' ? body.isResolved : !post.isResolved;
        } catch {
            newIsResolved = !post.isResolved;
        }

        const updatedPost = await db.post.update({
            where: { id: postId },
            data: { isResolved: newIsResolved },
            select: { id: true, isResolved: true },
        });

        return NextResponse.json({
            success: true,
            post: updatedPost,
            message: updatedPost.isResolved
                ? '¡Excelente! Tu mascota ha sido marcada como encontrada'
                : 'El post ha sido marcado como activo nuevamente',
        });
    } catch (error) {
        console.error('Error resolving lost pet post:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update post' },
            { status: 500 }
        );
    }
}
