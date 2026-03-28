import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { storeServiceSchema } from '@/lib/schemas';

// GET - List services for a store
export async function GET(
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

    const services = await db.storeService.findMany({
      where: { storeId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, services });
  } catch (error) {
    console.error('Error fetching store services:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener servicios' },
      { status: 500 }
    );
  }
}

// POST - Add service to store
export async function POST(
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
    console.error('Error creating store service:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear servicio' },
      { status: 500 }
    );
  }
}
