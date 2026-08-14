import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { adopterProfileSchema } from '@/lib/schemas';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const [profile, owner] = await Promise.all([
    db.adopterProfile.findUnique({ where: { userId: auth.session.user.id } }),
    db.owner.findUnique({
      where: { userId: auth.session.user.id },
      select: { hasYard: true, hasOtherPets: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    profile: profile || {
      housingType: 'apartment',
      hasYard: owner?.hasYard || false,
      hasKids: false,
      hasOtherPets: owner?.hasOtherPets || false,
      experience: 'some',
      hoursAvailable: '',
      notes: '',
    },
  });
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = adopterProfileSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Datos inválidos', details: parsed.error.issues }, { status: 400 });
  }

  const profile = await db.adopterProfile.upsert({
    where: { userId: auth.session.user.id },
    update: parsed.data,
    create: { userId: auth.session.user.id, ...parsed.data },
  });

  return NextResponse.json({ success: true, profile });
}
