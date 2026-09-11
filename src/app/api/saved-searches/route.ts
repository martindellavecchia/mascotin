import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { savedSearchSchema } from '@/lib/product-search';
import { productEnabled } from '@/lib/product-flags';
import { recordProductEvent } from '@/lib/server/product-events';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!productEnabled('SAVED_SEARCHES'))
    return NextResponse.json({ success: true, enabled: false, searches: [] });
  const searches = await db.savedSearch.findMany({
    where: { userId: auth.session.user.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ success: true, enabled: true, searches });
}
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!productEnabled('SAVED_SEARCHES'))
    return NextResponse.json({ error: 'Función no disponible' }, { status: 404 });
  const parsed = savedSearchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Revisá el nombre y los filtros' }, { status: 400 });
  const userId = auth.session.user.id;
  const search = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    if ((await tx.savedSearch.count({ where: { userId } })) >= 10) return null;
    const saved = await tx.savedSearch.create({ data: { ...parsed.data, userId } });
    await recordProductEvent(userId, 'saved_search_created', saved.id, tx);
    return saved;
  });
  if (!search)
    return NextResponse.json({ error: 'Podés guardar hasta 10 búsquedas' }, { status: 409 });
  return NextResponse.json({ success: true, search }, { status: 201 });
}
