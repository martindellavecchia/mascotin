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

    if (!user) {
      return NextResponse.json({ reason: 'invalid_credentials' });
    }

    if (user.isBlocked) {
      return NextResponse.json({ reason: 'blocked' });
    }

    if (!user.emailVerified) {
      return NextResponse.json({ reason: 'email_not_verified' });
    }

    return NextResponse.json({ reason: 'invalid_credentials' });
  } catch {
    return NextResponse.json({ reason: 'invalid_credentials' });
  }
}
