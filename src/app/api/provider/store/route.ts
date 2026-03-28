import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';

// GET - Get my assigned stores (provider view)
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const stores = await db.store.findMany({
      where: { providerId: auth.session.user.id },
      include: {
        category: { select: { id: true, name: true } },
        services: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, stores });
  } catch (error) {
    console.error('Error fetching provider stores:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener tiendas' },
      { status: 500 }
    );
  }
}
