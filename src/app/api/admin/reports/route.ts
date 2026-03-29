import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

// GET - List all reports (admin only)
export async function GET(request: Request) {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    const take = Math.min(Math.max(parseInt(limitParam || '50') || 50, 1), 100);

    const where: Prisma.ReportWhereInput = {};
    const validStatuses = ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'];
    if (status) {
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Estado inválido' },
          { status: 400 }
        );
      }
      where.status = status;
    }

    const reports = await db.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        reporter: {
          select: { id: true, name: true, email: true, image: true },
        },
        reported: {
          select: { id: true, name: true, email: true, image: true, isBlocked: true },
        },
      },
    });

    const counts = await db.report.groupBy({
      by: ['status'],
      _count: true,
    });

    const statusCounts = {
      PENDING: 0,
      REVIEWED: 0,
      RESOLVED: 0,
      DISMISSED: 0,
    };

    counts.forEach(c => {
      statusCounts[c.status as keyof typeof statusCounts] = c._count;
    });

    return NextResponse.json({ success: true, reports, counts: statusCounts });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener reportes' },
      { status: 500 }
    );
  }
}
