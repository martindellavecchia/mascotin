import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return false;

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    return user?.role === 'ADMIN';
}

/**
 * Middleware to require admin access
 * Returns error response if not admin, or null if authorized
 */
export async function requireAdmin(): Promise<NextResponse | null> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json(
            { success: false, error: 'Not authenticated' },
            { status: 401 }
        );
    }

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
        return NextResponse.json(
            { success: false, error: 'Admin access required' },
            { status: 403 }
        );
    }

    return null; // Authorized
}

/**
 * Get current user's role
 */
export async function getUserRole(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    return user?.role || null;
}
