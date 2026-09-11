import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { getInbox } from '@/lib/server/inbox';
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  return NextResponse.json({ success: true, conversations: await getInbox(auth.session.user.id) });
}
