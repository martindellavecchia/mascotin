import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { providerUpdateStoreSchema, storeServiceSchema } from '@/lib/schemas';

// GET - Get my store details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const store = await db.store.findFirst({
      where: { id: params.id, providerId: auth.session.user.id },
      include: {
        category: true,
        services: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Tienda no encontrada o no te pertenece' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, store });
  } catch (error) {
    console.error('Error fetching store:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener tienda' },
      { status: 500 }
    );
  }
}

// PATCH - Customize my store (provider can only edit certain fields)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const store = await db.store.findFirst({
      where: { id: params.id, providerId: auth.session.user.id },
    });
    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Tienda no encontrada o no te pertenece' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = providerUpdateStoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.images) {
      updateData.images = JSON.stringify(parsed.data.images);
    }

    const updated = await db.store.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
        services: { orderBy: { createdAt: 'desc' } },
      },
    });

    return NextResponse.json({ success: true, store: updated });
  } catch (error) {
    console.error('Error updating store:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar tienda' },
      { status: 500 }
    );
  }
}

// POST - Add service to my store
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const store = await db.store.findFirst({
      where: { id: params.id, providerId: auth.session.user.id },
    });
    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Tienda no encontrada o no te pertenece' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = storeServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const service = await db.storeService.create({
      data: {
        storeId: params.id,
        ...parsed.data,
      },
    });

    return NextResponse.json({ success: true, service }, { status: 201 });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear servicio' },
      { status: 500 }
    );
  }
}
