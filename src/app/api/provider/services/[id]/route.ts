import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { storeServiceSchema } from '@/lib/schemas';
import { invalidatePublicStoreCache } from '@/lib/server/stores';

type Context = { params: Promise<{ id: string }> };

const updateServiceSchema = storeServiceSchema
  .omit({ isActive: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'No hay cambios para guardar');

async function findOwnedService(userId: string, serviceId: string) {
  const provider = await db.providerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!provider) return { provider: null, service: null };
  const service = await db.service.findFirst({
    where: { id: serviceId, providerId: provider.id },
    select: { id: true, storeId: true },
  });
  return { provider, service };
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const { provider, service } = await findOwnedService(auth.session.user.id, id);
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Necesitás una cuenta de proveedor' },
        { status: 403 }
      );
    }
    if (!service) {
      return NextResponse.json({ success: false, error: 'Servicio no encontrado' }, { status: 404 });
    }

    const parsed = updateServiceSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Revisá nombre, descripción (mín. 5 caracteres), precio y duración',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const updated = await db.service.update({
      where: { id: service.id },
      data: parsed.data,
      include: { _count: { select: { appointments: true } } },
    });
    if (service.storeId) {
      await invalidatePublicStoreCache({ id: service.storeId });
    }

    return NextResponse.json({ success: true, service: updated });
  } catch (error) {
    console.error('Error updating provider service:', error);
    return NextResponse.json(
      { success: false, error: 'No pudimos actualizar el servicio' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: Context) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const { provider, service } = await findOwnedService(auth.session.user.id, id);
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Necesitás una cuenta de proveedor' },
        { status: 403 }
      );
    }
    if (!service) {
      return NextResponse.json({ success: false, error: 'Servicio no encontrado' }, { status: 404 });
    }

    const outcome = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ProviderProfile" WHERE id = ${provider.id} FOR UPDATE`;
      const upcoming = await tx.appointment.count({
        where: {
          serviceId: service.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
          date: { gte: new Date() },
        },
      });
      if (upcoming > 0) return 'upcoming' as const;
      const history = await tx.appointment.count({ where: { serviceId: service.id } });
      if (history > 0) return 'history' as const;
      await tx.service.delete({ where: { id: service.id } });
      return 'deleted' as const;
    });

    if (outcome === 'upcoming') {
      return NextResponse.json(
        {
          success: false,
          error: 'Este servicio tiene turnos próximos. Cancelalos antes de eliminarlo.',
        },
        { status: 409 }
      );
    }
    if (outcome === 'history') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Este servicio tiene historial de turnos, por eso no se puede eliminar. Podés editar su nombre, descripción o precio.',
        },
        { status: 409 }
      );
    }

    if (service.storeId) {
      await invalidatePublicStoreCache({ id: service.storeId });
    }
    return NextResponse.json({ success: true, message: 'Servicio eliminado' });
  } catch (error) {
    console.error('Error deleting provider service:', error);
    return NextResponse.json(
      { success: false, error: 'No pudimos eliminar el servicio' },
      { status: 500 }
    );
  }
}
