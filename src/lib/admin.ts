import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

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
 * Require admin access with rate limiting for write operations.
 * Returns error response if not admin or rate limited, or null if authorized.
 */
export async function requireAdminWrite(request: Request): Promise<NextResponse | null> {
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;

    const session = await getServerSession(authOptions);
    const limit = await rateLimit(`admin-write:${session!.user.id}`, RATE_LIMITS.adminWrite);
    if (!limit.allowed) {
        return NextResponse.json(
            { success: false, error: 'Demasiados intentos. Intenta más tarde.' },
            { status: 429 }
        );
    }

    return null;
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
