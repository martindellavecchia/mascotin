import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ reason: 'invalid_credentials' });
    }

    const user = await db.user.findUnique({
      where: { email },
      select: { isBlocked: true, emailVerified: true },
    });

    // Return specific reason only for conditions the user needs to act on.
    // For non-existent users, return the same generic message to prevent enumeration.
    if (!user) {
      return NextResponse.json({ reason: 'invalid_credentials' });
    }

    if (user.isBlocked) {
      // This is safe to disclose — blocked users need to know why they can't log in
      return NextResponse.json({ reason: 'blocked' });
    }

    // Don't differentiate between "unverified" and "invalid credentials"
    // to avoid confirming account existence
    return NextResponse.json({ reason: 'invalid_credentials' });
  } catch {
    return NextResponse.json({ reason: 'invalid_credentials' });
  }
}
