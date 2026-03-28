import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { createStoreCategorySchema } from '@/lib/schemas';

// GET - List all store categories
export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const categories = await db.storeCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { stores: true } },
      },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching store categories:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener categorías' },
      { status: 500 }
    );
  }
}

// POST - Create a new store category
export async function POST(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = createStoreCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.storeCategory.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una categoría con ese nombre' },
        { status: 409 }
      );
    }

    const category = await db.storeCategory.create({
      data: parsed.data,
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error) {
    console.error('Error creating store category:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear categoría' },
      { status: 500 }
    );
  }
}
