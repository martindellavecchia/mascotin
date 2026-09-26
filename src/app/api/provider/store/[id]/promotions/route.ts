import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { storePromotionSchema } from '@/lib/schemas';
import { invalidatePublicStoreCache } from '@/lib/server/stores';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const promotions = await db.storePromotion.findMany({
    where: { store: { id, providerId: auth.session.user.id } },
    orderBy: { startsAt: 'desc' },
  });
  return NextResponse.json({ success: true, promotions });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const store = await db.store.findFirst({
      where: { id, providerId: auth.session.user.id },
    });
    if (!store) {
      return NextResponse.json({ success: false, error: 'Negocio no encontrado' }, { status: 404 });
    }

    const parsed = storePromotionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Revisá el título (mín. 2 caracteres), el detalle (mín. 10) y las fechas', details: parsed.error.issues }, { status: 400 });
    }

    const startsAt = new Date(parsed.data.startsAt);
    const endsAt = new Date(parsed.data.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return NextResponse.json({ success: false, error: 'Revisá las fechas de la promoción' }, { status: 400 });
    }
    if (endsAt <= startsAt) {
      return NextResponse.json({ success: false, error: 'La fecha de fin tiene que ser posterior al inicio' }, { status: 400 });
    }
    if (endsAt <= new Date()) {
      return NextResponse.json({ success: false, error: 'La promoción ya terminó. Elegí una fecha de fin futura.' }, { status: 400 });
    }

    const promotion = await db.storePromotion.create({
      data: {
        storeId: store.id,
        title: parsed.data.title,
        body: parsed.data.body,
        startsAt,
        endsAt,
      },
    });

    await db.store.update({
      where: { id: store.id },
      data: { plan: 'FEATURED', featuredUntil: endsAt },
    });
    await invalidatePublicStoreCache(store);

    return NextResponse.json({ success: true, promotion }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'No se pudo crear la promoción' }, { status: 500 });
  }
}
