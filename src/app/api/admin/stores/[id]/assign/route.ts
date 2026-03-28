import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { assignStoreSchema } from '@/lib/schemas';

// PATCH - Assign store to a provider (user)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = assignStoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const store = await db.store.findUnique({ where: { id: params.id } });
    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Tienda no encontrada' },
        { status: 404 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: parsed.data.providerId },
      select: { id: true, name: true, email: true, role: true, isBlocked: true },
    });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { success: false, error: 'No se puede asignar tienda a un usuario bloqueado' },
        { status: 400 }
      );
    }

    // Assign store and promote user to PROVIDER in a transaction
    const [updatedStore] = await db.$transaction([
      db.store.update({
        where: { id: params.id },
        data: { providerId: user.id },
        include: {
          category: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true, email: true } },
        },
      }),
      db.user.update({
        where: { id: user.id },
        data: { role: 'PROVIDER' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      store: updatedStore,
      message: `Tienda asignada a ${user.name || user.email}`,
    });
  } catch (error) {
    console.error('Error assigning store:', error);
    return NextResponse.json(
      { success: false, error: 'Error al asignar tienda' },
      { status: 500 }
    );
  }
}

// DELETE - Unassign store from provider
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const store = await db.store.findUnique({ where: { id: params.id } });
    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Tienda no encontrada' },
        { status: 404 }
      );
    }

    if (!store.providerId) {
      return NextResponse.json(
        { success: false, error: 'La tienda no está asignada a ningún proveedor' },
        { status: 400 }
      );
    }

    const previousProviderId = store.providerId;

    // Unassign store
    const updatedStore = await db.store.update({
      where: { id: params.id },
      data: { providerId: null },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    // If provider has no other stores, revert to OWNER
    const otherStores = await db.store.count({
      where: { providerId: previousProviderId, id: { not: params.id } },
    });
    if (otherStores === 0) {
      await db.user.update({
        where: { id: previousProviderId },
        data: { role: 'OWNER' },
      });
    }

    return NextResponse.json({
      success: true,
      store: updatedStore,
      message: 'Tienda desasignada del proveedor',
    });
  } catch (error) {
    console.error('Error unassigning store:', error);
    return NextResponse.json(
      { success: false, error: 'Error al desasignar tienda' },
      { status: 500 }
    );
  }
}
