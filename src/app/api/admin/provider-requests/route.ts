import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export async function GET(request: Request) {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const where: Prisma.ProviderRequestWhereInput = {};
        if (status && status !== 'ALL') {
            where.status = status as any;
        }

        const [requests, counts] = await Promise.all([
            db.providerRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: 50,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                            role: true,
                        },
                    },
                },
            }),
            db.providerRequest.groupBy({
                by: ['status'],
                _count: true,
            }),
        ]);

        const statusCounts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
        counts.forEach((c) => {
            statusCounts[c.status as keyof typeof statusCounts] = c._count;
        });

        return NextResponse.json({ success: true, requests, counts: statusCounts });
    } catch (error) {
        console.error('Error fetching provider requests:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener solicitudes' },
            { status: 500 }
        );
    }
}
