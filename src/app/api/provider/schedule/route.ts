import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { scheduleSchema } from '@/lib/booking-schedule';
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const provider = await db.providerProfile.findUnique({
    where: { userId: auth.session.user.id },
    select: { schedule: true },
  });
  return NextResponse.json(
    provider
      ? { success: true, schedule: provider.schedule }
      : { error: 'Perfil de prestador requerido' },
    { status: provider ? 200 : 403 }
  );
}
export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const parsed = scheduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Horarios inválidos' },
      { status: 400 }
    );
  const provider = await db.providerProfile.findUnique({
    where: { userId: auth.session.user.id },
    select: { id: true },
  });
  if (!provider)
    return NextResponse.json({ error: 'Perfil de prestador requerido' }, { status: 403 });
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ProviderProfile" WHERE id = ${provider.id} FOR UPDATE`;
    await tx.providerProfile.update({
      where: { id: provider.id },
      data: { schedule: parsed.data },
    });
  });
  return NextResponse.json({ success: true });
}
