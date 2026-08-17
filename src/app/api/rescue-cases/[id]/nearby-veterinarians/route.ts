import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { db } from '@/lib/db';
import { haversineKm } from '@/lib/geo';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const [rescueCase, viewer] = await Promise.all([
    db.rescueCase.findUnique({
      where: { id: (await params).id },
      include: {
        needs: { where: { type: 'VETERINARY' }, select: { id: true } },
        communityPost: { select: { isVisible: true } },
        createdBy: { select: { syntheticRunId: true } },
      },
    }),
    db.user.findUnique({ where: { id: auth.session.user.id }, select: { syntheticRunId: true } }),
  ]);
  if (!rescueCase || rescueCase.createdBy.syntheticRunId !== (viewer?.syntheticRunId || null)) {
    return NextResponse.json({ success: false, error: 'Caso no encontrado' }, { status: 404 });
  }
  if (rescueCase.needs.length === 0) {
    return NextResponse.json({ success: false, error: 'El caso no requiere ayuda veterinaria' }, { status: 409 });
  }
  if (rescueCase.createdByUserId !== auth.session.user.id && !rescueCase.communityPost?.isVisible) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  }

  const stores = await db.store.findMany({
    where: {
      isActive: true,
      latitude: { not: null },
      longitude: { not: null },
      category: { isActive: true, name: { contains: 'veter', mode: 'insensitive' } },
    },
    include: { category: { select: { name: true } } },
    take: 200,
  });
  const veterinarians = stores
    .flatMap((store) => store.latitude === null || store.longitude === null ? [] : [{
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      address: store.address,
      image: store.image,
      ratingAverage: store.ratingAverage,
      reviewCount: store.reviewCount,
      category: store.category.name,
      distanceKm: Number(haversineKm(
        { latitude: rescueCase.latitude, longitude: rescueCase.longitude },
        { latitude: store.latitude, longitude: store.longitude },
      ).toFixed(1)),
      link: `/shop/${store.slug}`,
    }])
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, 5);
  return NextResponse.json({ success: true, veterinarians });
}
