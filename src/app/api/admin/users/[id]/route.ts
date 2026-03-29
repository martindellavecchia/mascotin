import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, requireAdminWrite } from '@/lib/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get single user details
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const user = await db.user.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isBlocked: true,
                image: true,
                createdAt: true,
                owner: {
                    include: {
                        pets: true,
                    },
                },
                providerProfile: {
                    include: {
                        services: true,
                    },
                },
                _count: {
                    select: {
                        posts: true,
                        comments: true,
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch user' },
            { status: 500 }
        );
    }
}

// PATCH - Update user (role, blocked status)
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const authError = await requireAdminWrite(request);
    if (authError) return authError;

    try {
        const session = await getServerSession(authOptions);
        const body = await request.json();
        const { role, isBlocked } = body;

        // Prevent admin from demoting themselves
        if (params.id === session?.user?.id && role && role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Cannot change your own role' },
                { status: 400 }
            );
        }

        const updateData: any = {};

        if (role !== undefined) {
            if (!['OWNER', 'PROVIDER', 'ADMIN'].includes(role)) {
                return NextResponse.json(
                    { success: false, error: 'Invalid role' },
                    { status: 400 }
                );
            }
            updateData.role = role;

            // If changing to PROVIDER, create ProviderProfile if doesn't exist
            if (role === 'PROVIDER') {
                const existingProfile = await db.providerProfile.findUnique({
                    where: { userId: params.id },
                });
                if (!existingProfile) {
                    const user = await db.user.findUnique({
                        where: { id: params.id },
                        select: { name: true },
                    });
                    await db.providerProfile.create({
                        data: {
                            userId: params.id,
                            businessName: user?.name || 'Mi Negocio',
                            location: 'Por definir',
                        },
                    });
                }
            }
        }

        if (isBlocked !== undefined) {
            // Prevent admin from blocking themselves
            if (params.id === session?.user?.id && isBlocked) {
                return NextResponse.json(
                    { success: false, error: 'Cannot block yourself' },
                    { status: 400 }
                );
            }
            updateData.isBlocked = isBlocked;
        }

        const user = await db.user.update({
            where: { id: params.id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isBlocked: true,
            },
        });

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update user' },
            { status: 500 }
        );
    }
}

// DELETE - Delete user
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const authError = await requireAdminWrite(request);
    if (authError) return authError;

    try {
        const session = await getServerSession(authOptions);

        // Prevent admin from deleting themselves
        if (params.id === session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Cannot delete yourself' },
                { status: 400 }
            );
        }

        await db.user.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}
