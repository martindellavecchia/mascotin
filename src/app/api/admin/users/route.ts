import { NextResponse } from 'next/server';
import { Prisma, UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

// GET - List all users with pagination and filters
export async function GET(request: Request) {
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1);
        const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20') || 20, 1), 100);
        const search = searchParams.get('search') || '';
        const role = searchParams.get('role') || '';
        const blocked = searchParams.get('blocked');

        const where: Prisma.UserWhereInput = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (role) {
            if (!Object.values(UserRole).includes(role as UserRole)) {
                return NextResponse.json(
                    { success: false, error: 'Invalid role filter' },
                    { status: 400 }
                );
            }
            where.role = role as UserRole;
        }

        if (blocked !== null && blocked !== '') {
            where.isBlocked = blocked === 'true';
        }

        const [users, total] = await Promise.all([
            db.user.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isBlocked: true,
                    image: true,
                    createdAt: true,
                    _count: {
                        select: {
                            posts: true,
                        },
                    },
                    owner: {
                        select: {
                            id: true,
                            _count: {
                                select: { pets: true },
                            },
                        },
                    },
                    providerProfile: {
                        select: {
                            id: true,
                            businessName: true,
                        },
                    },
                },
            }),
            db.user.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}


