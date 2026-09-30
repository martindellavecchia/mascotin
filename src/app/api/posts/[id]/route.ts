import { updatePostSchema } from '@/lib/schemas';
import { assertEventEditor, EventPostError, linkedEventSelect, withEventDetails } from '@/lib/server/event-posts';
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
                event: { select: linkedEventSelect },
                author: {
                    select: { id: true, name: true, image: true }
                },
                pet: {
                    select: { id: true, name: true, images: true, thumbnailIndex: true, petType: true }
                },
                _count: {
                    select: { likes: true, comments: true }
                }
            }
        });

        if (!post) {
            return NextResponse.json({ success: false, error: 'Publicación no encontrada' }, { status: 404 });
        }

        return NextResponse.json({ success: true, post: withEventDetails(post) });
    } catch (error) {
        if (error instanceof EventPostError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
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
        const parsed = updatePostSchema.safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos inválidos', details: parsed.error.issues }, { status: 400 });
        const updatedPost = await db.$transaction(async (tx) => {
            const existing = await tx.post.findUnique({ where: { id }, include: { event: true } });
            if (!existing) throw new EventPostError('Publicación no encontrada', 404);
            if (existing.authorId !== session.user.id) throw new EventPostError('No podés editar esta publicación', 403);
            const { content, images, postType, eventDate, eventLocation } = parsed.data;
            const nextType = postType ?? existing.postType;
            let eventId = existing.eventId;
            let date = eventDate === undefined ? existing.event?.date ?? existing.eventDate : eventDate ? new Date(eventDate) : null;
            let location = eventLocation === undefined ? existing.event?.location ?? existing.eventLocation : eventLocation;
            if (nextType === 'event') {
                if (!date || !location?.trim()) throw new EventPostError('Los eventos requieren fecha y ubicación', 400);
                if (existing.event) {
                    if (eventDate !== undefined || eventLocation !== undefined) {
                        await assertEventEditor(tx, existing.event, session.user.id);
                        await tx.event.update({ where: { id: existing.event.id }, data: { date, location } });
                    }
                } else if (existing.postType !== 'event') {
                    const text = content ?? existing.content;
                    const event = await tx.event.create({ data: {
                        authorId: session.user.id, groupId: existing.groupId, title: text.split('\n')[0].slice(0, 50),
                        description: text, date, location,
                    } });
                    eventId = event.id;
                }
            } else {
                eventId = null;
                date = null;
                location = null;
            }
            const post = await tx.post.update({
                where: { id },
                data: {
                    ...(content !== undefined ? { content } : {}),
                    ...(images !== undefined ? { images: Array.isArray(images) ? JSON.stringify(images) : images } : {}),
                    postType: nextType, eventId, eventDate: date, eventLocation: location,
                },
                include: { event: { select: linkedEventSelect } },
            });
            return withEventDetails(post);
        });

        return NextResponse.json({ success: true, post: updatedPost });
    } catch (error) {
        if (error instanceof EventPostError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
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
            return NextResponse.json({ success: false, error: 'Publicación no encontrada' }, { status: 404 });
        }

        if (post.authorId !== session.user.id) {
            return NextResponse.json({ success: false, error: 'No podés eliminar esta publicación' }, { status: 403 });
        }

        await db.post.delete({ where: { id } });

        return NextResponse.json({ success: true, message: 'Publicación eliminada' });
    } catch (error) {
        if (error instanceof EventPostError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        console.error('Error deleting post:', error);
        return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
}
