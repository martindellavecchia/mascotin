import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get current user's provider profile
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const provider = await db.providerProfile.findUnique({
            where: { userId: session.user.id },
            include: {
                services: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        return NextResponse.json({
            success: true,
            provider,
            isProvider: !!provider,
        });
    } catch (error) {
        console.error('Error fetching provider profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch provider profile' },
            { status: 500 }
        );
    }
}

// POST - Create or update provider profile
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { businessName, description, location } = body;

        if (!businessName || !location) {
            return NextResponse.json(
                { success: false, error: 'Business name and location are required' },
                { status: 400 }
            );
        }

        // Check if provider profile already exists
        const existing = await db.providerProfile.findUnique({
            where: { userId: session.user.id },
        });

        let provider;
        if (existing) {
            // Update
            provider = await db.providerProfile.update({
                where: { userId: session.user.id },
                data: {
                    businessName,
                    description,
                    location,
                },
            });
        } else {
            // Create and update user role
            provider = await db.providerProfile.create({
                data: {
                    userId: session.user.id,
                    businessName,
                    description,
                    location,
                },
            });

            // Update user role to PROVIDER
            await db.user.update({
                where: { id: session.user.id },
                data: { role: 'PROVIDER' },
            });
        }

        return NextResponse.json({
            success: true,
            provider,
        });
    } catch (error) {
        console.error('Error creating provider profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create provider profile' },
            { status: 500 }
        );
    }
}
