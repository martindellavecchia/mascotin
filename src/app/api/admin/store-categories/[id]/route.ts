import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { updateStoreCategorySchema } from '@/lib/schemas';

// GET - Get single category with its stores
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const category = await db.storeCategory.findUnique({
      where: { id: params.id },
      include: {
        stores: {
          include: {
            provider: { select: { id: true, name: true, email: true } },
            _count: { select: { services: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('Error fetching store category:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener categoría' },
      { status: 500 }
    );
  }
}

// PATCH - Update category
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = updateStoreCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Check name uniqueness if changing name
    if (parsed.data.name) {
      const existing = await db.storeCategory.findFirst({
        where: { name: parsed.data.name, id: { not: params.id } },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Ya existe otra categoría con ese nombre' },
          { status: 409 }
        );
      }
    }

    const category = await db.storeCategory.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('Error updating store category:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar categoría' },
      { status: 500 }
    );
  }
}

// DELETE - Delete category (only if no stores)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const storeCount = await db.store.count({
      where: { categoryId: params.id },
    });

    if (storeCount > 0) {
      return NextResponse.json(
        { success: false, error: `No se puede eliminar: tiene ${storeCount} tienda(s) asociada(s)` },
        { status: 400 }
      );
    }

    await db.storeCategory.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: 'Categoría eliminada' });
  } catch (error) {
    console.error('Error deleting store category:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar categoría' },
      { status: 500 }
    );
  }
}
