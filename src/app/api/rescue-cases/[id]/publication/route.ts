import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { rescueCasePublicationSchema } from '@/lib/schemas';
import { FosterNetworkError, publishRescueCase, unpublishRescueCase } from '@/lib/server/foster-network';
import { notifySolidaritySubscribersForCase } from '@/lib/server/solidarity-alerts';

function errorResponse(error: unknown) {
  if (error instanceof FosterNetworkError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  console.error('Error managing foster publication:', error);
  return NextResponse.json({ success: false, error: 'No se pudo actualizar la publicación' }, { status: 500 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;
  const parsed = rescueCasePublicationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Revisá el resumen y la zona pública', details: parsed.error.issues }, { status: 400 });
  }
  try {
    const post = await publishRescueCase(id, auth.session.user.id, parsed.data);
    await notifySolidaritySubscribersForCase(id);
    return NextResponse.json({ success: true, publication: { id: post.id, isVisible: post.isVisible } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;
  try {
    await unpublishRescueCase(id, auth.session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
