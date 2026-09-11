import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { savedSearchSchema } from '@/lib/product-search';

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const parsed = savedSearchSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  const { id } = await params;
  const result = await db.savedSearch.updateMany({
    where: { id, userId: auth.session.user.id },
    data: {
      ...parsed.data,
      ...(parsed.data.filters ? { lastCheckedAt: new Date(), lastCheckedId: '' } : {}),
    },
  });
  return NextResponse.json({ success: result.count === 1 }, { status: result.count ? 200 : 404 });
}
export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;
  const result = await db.savedSearch.deleteMany({ where: { id, userId: auth.session.user.id } });
  return NextResponse.json({ success: result.count === 1 }, { status: result.count ? 200 : 404 });
}
