import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { createStoreSchema } from '@/lib/schemas';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// GET - List all stores (with filters)
export async function GET(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const assigned = searchParams.get('assigned'); // "true" | "false"
    const isActive = searchParams.get('isActive'); // "true" | "false"

    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId;
    if (assigned === 'true') where.providerId = { not: null };
    if (assigned === 'false') where.providerId = null;
    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;

    const stores = await db.store.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true, email: true } },
        _count: { select: { services: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, stores });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener tiendas' },
      { status: 500 }
    );
  }
}

// POST - Create a new store
export async function POST(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = createStoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = await db.storeCategory.findUnique({
      where: { id: parsed.data.categoryId },
    });
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // Generate unique slug
    let slug = slugify(parsed.data.name);
    const existingSlug = await db.store.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const store = await db.store.create({
      data: {
        ...parsed.data,
        slug,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, store }, { status: 201 });
  } catch (error) {
    console.error('Error creating store:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear tienda' },
      { status: 500 }
    );
  }
}
