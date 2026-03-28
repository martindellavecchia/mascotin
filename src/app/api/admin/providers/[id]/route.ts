import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

// GET - Get single provider details
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const adminError = await requireAdmin();
        if (adminError) return adminError;

        const provider = await db.providerProfile.findUnique({
            where: { id: params.id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        image: true,
                        createdAt: true,
                    },
                },
                services: true,
                _count: {
                    select: {
                        services: true,
                    },
                },
            },
        });

        if (!provider) {
            return NextResponse.json(
                { success: false, error: 'Provider not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, provider });
    } catch (error) {
        console.error('Error fetching provider:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch provider' },
            { status: 500 }
        );
    }
}

// PATCH - Update provider profile
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const adminError = await requireAdmin();
        if (adminError) return adminError;

        const body = await request.json();
        const { description, location, businessName } = body;

        const provider = await db.providerProfile.update({
            where: { id: params.id },
            data: {
                ...(description !== undefined && { description }),
                ...(location !== undefined && { location }),
                ...(businessName !== undefined && { businessName }),
            },
        });

        return NextResponse.json({
            success: true,
            provider,
            message: 'Proveedor actualizado',
        });
    } catch (error) {
        console.error('Error updating provider:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update provider' },
            { status: 500 }
        );
    }
}

// DELETE - Delete provider
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const adminError = await requireAdmin();
        if (adminError) return adminError;

        // First delete related services and appointments
        await db.service.deleteMany({
            where: { providerId: params.id },
        });

        await db.providerProfile.delete({
            where: { id: params.id },
        });

        return NextResponse.json({
            success: true,
            message: 'Proveedor eliminado',
        });
    } catch (error) {
        console.error('Error deleting provider:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete provider' },
            { status: 500 }
        );
    }
}
