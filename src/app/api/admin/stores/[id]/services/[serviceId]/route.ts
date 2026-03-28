import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { storeServiceSchema } from '@/lib/schemas';

// PATCH - Update a store service
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; serviceId: string } }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const service = await db.storeService.findFirst({
      where: { id: params.serviceId, storeId: params.id },
    });
    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = storeServiceSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updated = await db.storeService.update({
      where: { id: params.serviceId },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, service: updated });
  } catch (error) {
    console.error('Error updating store service:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar servicio' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a store service
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; serviceId: string } }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const service = await db.storeService.findFirst({
      where: { id: params.serviceId, storeId: params.id },
    });
    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    await db.storeService.delete({ where: { id: params.serviceId } });

    return NextResponse.json({ success: true, message: 'Servicio eliminado' });
  } catch (error) {
    console.error('Error deleting store service:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar servicio' },
      { status: 500 }
    );
  }
}
