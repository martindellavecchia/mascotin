import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { createReportSchema } from '@/lib/schemas';

// POST - Create a report
export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const session = auth.session;

    const body = await request.json();
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { reportedId, reason, description } = parsed.data;

    if (reportedId === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'No puedes reportarte a ti mismo' },
        { status: 400 }
      );
    }

    // Verify target user exists
    const targetUser = await db.user.findUnique({
      where: { id: reportedId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Check for duplicate pending report
    const existingReport = await db.report.findFirst({
      where: {
        reporterId: session.user.id,
        reportedId,
        status: 'PENDING',
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { success: false, error: 'Ya tienes un reporte pendiente para este usuario' },
        { status: 409 }
      );
    }

    const report = await db.report.create({
      data: {
        reporterId: session.user.id,
        reportedId,
        reason,
        description,
      },
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear reporte' },
      { status: 500 }
    );
  }
}
