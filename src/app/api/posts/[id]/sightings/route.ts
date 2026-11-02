import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { createSightingSchema } from '@/lib/schemas';
import { createNotification } from '@/lib/notifications';
import { resolveCoordinates } from '@/lib/pet-payload';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const post = await db.post.findFirst({
    where: { id, isVisible: true, postType: { in: ['lost_pet', 'found_pet'] } },
    select: { authorId: true },
  });
  if (!post) {
    return NextResponse.json({ success: false, error: 'Alerta no encontrada' }, { status: 404 });
  }

  const sightings = await db.petSighting.findMany({
    where: { postId: id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      reporter: { select: { id: true, name: true, image: true } },
    },
  });

  const viewerId = auth.session.user.id;
  return NextResponse.json({
    success: true,
    sightings: sightings.map((sighting) => {
      const canSeeDetails = post.authorId === viewerId || sighting.reporterId === viewerId;
      return {
        id: sighting.id,
        postId: sighting.postId,
        notes: sighting.notes,
        location: sighting.location,
        image: sighting.image,
        createdAt: sighting.createdAt,
        reporter: { name: sighting.reporter.name, image: sighting.reporter.image },
        ...(canSeeDetails && {
          reporterId: sighting.reporterId,
          latitude: sighting.latitude,
          longitude: sighting.longitude,
        }),
      };
    }),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = createSightingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Datos inválidos' }, { status: 400 });
    }

    const post = await db.post.findUnique({
      where: { id },
      select: { id: true, authorId: true, postType: true, isResolved: true },
    });

    if (!post || !['lost_pet', 'found_pet'].includes(post.postType)) {
      return NextResponse.json({ success: false, error: 'Alerta no encontrada' }, { status: 404 });
    }

    const coords = parsed.data.location
      ? await resolveCoordinates(parsed.data.location)
      : null;

    const sighting = await db.petSighting.create({
      data: {
        postId: id,
        reporterId: auth.session.user.id,
        notes: parsed.data.notes,
        location: parsed.data.location,
        image: parsed.data.image,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      },
    });

    if (post.authorId !== auth.session.user.id) {
      createNotification({
        userId: post.authorId,
        actorId: auth.session.user.id,
        type: 'SIGHTING',
        title: 'Nuevo avistamiento',
        body: parsed.data.location
          ? `Alguien reportó un avistamiento en ${parsed.data.location}`
          : 'Alguien reportó un avistamiento de tu alerta',
        link: `/alerts?post=${id}`,
        entityId: sighting.id,
      }).catch(console.error);
    }

    return NextResponse.json({ success: true, sighting }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'No se pudo registrar el avistamiento' }, { status: 500 });
  }
}
