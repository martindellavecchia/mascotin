import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { db as prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { createGroupSchema } from '@/lib/schemas';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        const userId = searchParams.get('userId'); // Check membership for this user

        const where: Prisma.GroupWhereInput = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const groups = await prisma.group.findMany({
            where,
            include: {
                _count: {
                    select: { members: true },
                },
                members: userId ? {
                    where: { userId },
                    select: { userId: true }
                } : false,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const formattedGroups = groups.map(group => ({
            ...group,
            isMember: userId ? group.members.length > 0 : false,
            members: undefined, // Hide raw members array
        }));

        return NextResponse.json({ success: true, groups: formattedGroups });
    } catch (error) {
        console.error('Error fetching groups:', error);
        return NextResponse.json({ success: false, error: 'Error fetching groups' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = createGroupSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Datos inválidos', details: parsed.error.issues },
                { status: 400 }
            );
        }
        const { name, description, image } = parsed.data;

        const group = await prisma.group.create({
            data: {
                name,
                description,
                image,
                creatorId: session.user.id,
                members: {
                    create: {
                        userId: session.user.id,
                        role: 'ADMIN',
                    },
                },
            },
        });

        return NextResponse.json({ success: true, group });
    } catch (error) {
        console.error('Error creating group:', error);
        return NextResponse.json({ success: false, error: 'Error creating group' }, { status: 500 });
    }
}
