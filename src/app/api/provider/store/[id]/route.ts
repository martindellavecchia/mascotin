import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { providerUpdateStoreSchema, storeServiceSchema } from '@/lib/schemas';
import { createUniqueStoreSlug, parseStoreImages } from '@/lib/stores';
import { getStoreTrustSummary } from '@/lib/store-reputation';

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
        bookingServices: {
          include: { _count: { select: { appointments: true } } },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          where: { status: 'PUBLISHED' },
          include: {
            author: { select: { id: true, name: true, image: true } },
            _count: { select: { helpfulVotes: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Tienda no encontrada o no te pertenece' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      store: {
        ...store,
        images: parseStoreImages(store.images),
        trust: getStoreTrustSummary(store.ratingAverage, store.reviewCount),
      },
    });
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

    if (parsed.data.categoryId) {
      const category = await db.storeCategory.findFirst({
        where: { id: parsed.data.categoryId, isActive: true },
        select: { id: true },
      });
      if (!category) {
        return NextResponse.json(
          { success: false, error: 'La categoría seleccionada no existe' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.images) {
      updateData.images = JSON.stringify(parsed.data.images);
    }
    if (parsed.data.tags) {
      updateData.tags = JSON.stringify(parsed.data.tags);
    }
    if (parsed.data.name && parsed.data.name !== store.name) {
      updateData.slug = await db.$transaction((tx) =>
        createUniqueStoreSlug(tx, parsed.data.name!, store.id)
      );
    }

    const updated = await db.store.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
        services: { orderBy: { createdAt: 'desc' } },
        bookingServices: {
          include: { _count: { select: { appointments: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      store: {
        ...updated,
        images: parseStoreImages(updated.images),
        trust: getStoreTrustSummary(updated.ratingAverage, updated.reviewCount),
      },
    });
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

    const provider = await db.providerProfile.findUnique({
      where: { userId: auth.session.user.id },
      select: { id: true },
    });
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Perfil de proveedor no encontrado' },
        { status: 403 }
      );
    }

    const service = await db.service.create({
      data: {
        storeId: params.id,
        providerId: provider.id,
        name: parsed.data.name,
        description: parsed.data.description,
        price: parsed.data.price,
        duration: parsed.data.duration,
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
