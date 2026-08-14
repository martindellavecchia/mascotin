import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminWrite } from '@/lib/admin';
import { reviewModerationSchema } from '@/lib/schemas';
import { recalculateStoreRating } from '@/lib/stores';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminWrite(request);
  if (authError) return authError;

  try {
    const [{ id }, body] = await Promise.all([params, request.json()]);
    const parsed = reviewModerationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Estado de moderación inválido', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const existing = await db.storeReview.findUnique({
      where: { id },
      select: { id: true, storeId: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Reseña no encontrada' }, { status: 404 });
    }
    const review = await db.$transaction(async (tx) => {
      const updated = await tx.storeReview.update({
        where: { id },
        data: { status: parsed.data.status },
      });
      await tx.reviewReport.updateMany({
        where: { reviewId: id, status: 'PENDING' },
        data: { status: 'REVIEWED' },
      });
      await recalculateStoreRating(tx, existing.storeId);
      return updated;
    });
    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error('Error moderating review:', error);
    return NextResponse.json({ success: false, error: 'No se pudo moderar la reseña' }, { status: 500 });
  }
}
