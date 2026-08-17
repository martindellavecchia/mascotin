import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { parseJsonStringArray } from '@/lib/json-array';
import { resolveCoordinates } from '@/lib/pet-payload';
import { providerCreateStoreSchema } from '@/lib/schemas';
import { createUniqueStoreSlug, ensureDefaultStoreCategories, parseStoreImages } from '@/lib/stores';
import { getStoreTrustSummary } from '@/lib/store-reputation';
import { invalidateStoreCategoriesCache } from '@/lib/server/store-cache';
import { invalidatePublicStoreCache } from '@/lib/server/stores';

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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      stores: stores.map((store) => ({
        ...store,
        images: parseStoreImages(store.images),
        tags: parseJsonStringArray(store.tags),
        trust: getStoreTrustSummary(store.ratingAverage, store.reviewCount),
      })),
    });
  } catch (error) {
    console.error('Error fetching provider stores:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener tiendas' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = providerCreateStoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Revisá los datos del negocio', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const provider = await db.providerProfile.findUnique({
      where: { userId: auth.session.user.id },
      select: { id: true },
    });
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Necesitás una cuenta de proveedor aprobada' },
        { status: 403 }
      );
    }

    const existing = await db.store.findFirst({
      where: { providerId: auth.session.user.id },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Ya tenés un negocio registrado' },
        { status: 409 }
      );
    }

    const coords = parsed.data.address
      ? await resolveCoordinates(parsed.data.address)
      : null;

    const store = await db.$transaction(async (tx) => {
      await ensureDefaultStoreCategories(tx);
      const category = await tx.storeCategory.findFirst({
        where: { id: parsed.data.categoryId, isActive: true },
        select: { id: true },
      });
      if (!category) throw new Error('INVALID_CATEGORY');

      const slug = await createUniqueStoreSlug(tx, parsed.data.name);
      const created = await tx.store.create({
        data: {
          categoryId: category.id,
          providerId: auth.session.user.id,
          name: parsed.data.name,
          slug,
          description: parsed.data.description,
          phone: parsed.data.phone || null,
          email: parsed.data.email || null,
          address: parsed.data.address || null,
          image: parsed.data.image || null,
          tags: JSON.stringify(parsed.data.tags || []),
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        },
        include: { category: { select: { id: true, name: true } } },
      });

      await tx.service.updateMany({
        where: { providerId: provider.id },
        data: { storeId: created.id },
      });

      return created;
    });
    invalidateStoreCategoriesCache();
    await invalidatePublicStoreCache(store);

    return NextResponse.json(
      {
        success: true,
        store: {
          ...store,
          images: [],
          tags: parseJsonStringArray(store.tags),
          bookingServices: [],
          reviews: [],
          trust: getStoreTrustSummary(0, 0),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_CATEGORY') {
      return NextResponse.json(
        { success: false, error: 'La categoría seleccionada no existe' },
        { status: 400 }
      );
    }
    console.error('Error creating provider store:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo crear el negocio' },
      { status: 500 }
    );
  }
}
