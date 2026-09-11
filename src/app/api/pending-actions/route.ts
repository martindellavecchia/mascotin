import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { getPendingActions } from '@/lib/server/pending-actions';
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  return NextResponse.json({ actions: await getPendingActions(auth.session.user.id) });
}
