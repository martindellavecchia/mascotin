import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { parseImageUrls } from '@/lib/media';
import { fosterAdoptionDraftSchema } from '@/lib/schemas';
import { FosterAdoptionError, updateFosterAdoptionDraft } from '@/lib/server/foster-adoption';

export async function GET(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { caseId } = await params;
  const draft = await db.fosterAdoptionDraft.findUnique({
    where: { rescueCaseId: caseId },
    include: {
      rescueCase: { select: { createdByUserId: true, species: true, size: true } },
      listing: { select: { id: true, status: true } },
      selectedApplication: { select: { applicantId: true } },
    },
  });
  if (!draft) return NextResponse.json({ success: false, error: 'Borrador no encontrado' }, { status: 404 });
  const canView = draft.managedByUserId === auth.session.user.id ||
    draft.rescueCase.createdByUserId === auth.session.user.id ||
    draft.selectedApplication?.applicantId === auth.session.user.id;
  if (!canView) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  return NextResponse.json({
    success: true,
    canEdit: draft.managedByUserId === auth.session.user.id,
    draft: { ...draft, images: parseImageUrls(draft.images) },
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { caseId } = await params;
  const parsed = fosterAdoptionDraftSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Revisá los datos de la ficha', details: parsed.error.issues }, { status: 400 });
  }
  try {
    const draft = await updateFosterAdoptionDraft(caseId, auth.session.user.id, parsed.data);
    return NextResponse.json({ success: true, draft: { ...draft, images: parsed.data.images } });
  } catch (error) {
    if (error instanceof FosterAdoptionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error updating foster adoption draft:', error);
    return NextResponse.json({ success: false, error: 'No se pudo guardar el borrador' }, { status: 500 });
  }
}
