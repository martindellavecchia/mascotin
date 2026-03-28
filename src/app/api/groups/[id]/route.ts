import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db as prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const group = await prisma.group.findUnique({
            where: { id: params.id },
            include: {
                _count: { select: { members: true, posts: true } },
                creator: { select: { name: true, image: true, id: true } },
            },
        });

        if (!group) {
            return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
        }

        // Check if current user is member (requires getting session or userId from param if used)
        // For simple GET detail, we return public info. Frontend can check membership via separate call or context

        return NextResponse.json({ success: true, group });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error fetching group' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const group = await prisma.group.findUnique({ where: { id: params.id } });
        if (!group) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

        if (group.creatorId !== session.user.id) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const { name, description, image } = await req.json();

        const updatedGroup = await prisma.group.update({
            where: { id: params.id },
            data: { name, description, image },
        });

        return NextResponse.json({ success: true, group: updatedGroup });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error updating group' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const group = await prisma.group.findUnique({ where: { id: params.id } });
        if (!group) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

        if (group.creatorId !== session.user.id) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        await prisma.group.delete({ where: { id: params.id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error deleting group' }, { status: 500 });
    }
}
