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
                { success: false, error: 'No autenticado' },
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
                { success: false, error: 'Alerta no encontrada' },
                { status: 404 }
            );
        }

        if (post.authorId !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Solo quien publicó la alerta puede cambiar su estado' },
                { status: 403 }
            );
        }

        if (!['lost_pet', 'found_pet'].includes(post.postType)) {
            return NextResponse.json(
                { success: false, error: 'Esta acción solo aplica a alertas de mascotas perdidas o encontradas' },
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
                ? '¡Excelente! Marcamos a tu mascota como encontrada'
                : 'La alerta volvió a estar activa',
        });
    } catch (error) {
        console.error('Error resolving lost pet post:', error);
        return NextResponse.json(
            { success: false, error: 'No se pudo actualizar la alerta' },
            { status: 500 }
        );
    }
}
