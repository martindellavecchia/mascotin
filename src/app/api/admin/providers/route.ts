import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

// GET - List all providers with pagination
export async function GET(request: Request) {
    try {
        const adminError = await requireAdmin();
        if (adminError) return adminError;

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const search = searchParams.get('search') || '';
        const isActive = searchParams.get('isActive');

        const skip = (page - 1) * limit;

        const where: Prisma.ProviderProfileWhereInput = {};

        if (search) {
            where.OR = [
                { businessName: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }

        if (isActive === 'true') {
            where.user = { isBlocked: false };
        } else if (isActive === 'false') {
            where.user = { isBlocked: true };
        }

        const [providers, total] = await Promise.all([
            db.providerProfile.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            image: true,
                        },
                    },
                    _count: {
                        select: {
                            services: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            db.providerProfile.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            providers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching providers:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch providers' },
            { status: 500 }
        );
    }
}
