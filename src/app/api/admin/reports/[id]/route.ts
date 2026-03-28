import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { updateReportSchema } from '@/lib/schemas';

// PATCH - Update report status (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  try {
    const { id } = await params;

    const body = await request.json();
    const parsed = updateReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const report = await db.report.findUnique({
      where: { id },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Reporte no encontrado' },
        { status: 404 }
      );
    }

    const updated = await db.report.update({
      where: { id },
      data: { status: parsed.data.status },
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
        reported: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ success: true, report: updated });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar reporte' },
      { status: 500 }
    );
  }
}
