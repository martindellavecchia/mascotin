import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { updateStoreSchema } from '@/lib/schemas';

// GET - Get single store with full details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const store = await db.store.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        provider: { select: { id: true, name: true, email: true, role: true } },
        services: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Tienda no encontrada' },
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

// PATCH - Update store (admin can change anything)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = updateStoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.store.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tienda no encontrada' },
        { status: 404 }
      );
    }

    // If changing category, verify it exists
    if (parsed.data.categoryId) {
      const category = await db.storeCategory.findUnique({
        where: { id: parsed.data.categoryId },
      });
      if (!category) {
        return NextResponse.json(
          { success: false, error: 'Categoría no encontrada' },
          { status: 404 }
        );
      }
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.images) {
      updateData.images = JSON.stringify(parsed.data.images);
    }

    const store = await db.store.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, store });
  } catch (error) {
    console.error('Error updating store:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar tienda' },
      { status: 500 }
    );
  }
}

// DELETE - Delete store
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const existing = await db.store.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tienda no encontrada' },
        { status: 404 }
      );
    }

    // If store was assigned, revert user role to OWNER
    if (existing.providerId) {
      const otherStores = await db.store.count({
        where: { providerId: existing.providerId, id: { not: params.id } },
      });
      if (otherStores === 0) {
        await db.user.update({
          where: { id: existing.providerId },
          data: { role: 'OWNER' },
        });
      }
    }

    await db.store.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: 'Tienda eliminada' });
  } catch (error) {
    console.error('Error deleting store:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar tienda' },
      { status: 500 }
    );
  }
}
