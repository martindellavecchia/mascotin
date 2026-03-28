import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createProviderRequestSchema } from '@/lib/schemas';

// GET - Get current user's provider profile + latest request
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const [provider, latestRequest] = await Promise.all([
            db.providerProfile.findUnique({
                where: { userId: session.user.id },
                include: {
                    services: {
                        orderBy: { createdAt: 'desc' },
                    },
                },
            }),
            db.providerRequest.findFirst({
                where: { userId: session.user.id },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        return NextResponse.json({
            success: true,
            provider,
            isProvider: !!provider,
            providerRequest: latestRequest,
        });
    } catch (error) {
        console.error('Error fetching provider profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch provider profile' },
            { status: 500 }
        );
    }
}

// POST - Submit provider access request
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
        const parsed = createProviderRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Datos inválidos', details: parsed.error.issues },
                { status: 400 }
            );
        }

        // Already a provider?
        const existingProfile = await db.providerProfile.findUnique({
            where: { userId: session.user.id },
        });
        if (existingProfile) {
            return NextResponse.json(
                { success: false, error: 'Ya eres proveedor' },
                { status: 400 }
            );
        }

        // Already has a pending request?
        const existingRequest = await db.providerRequest.findFirst({
            where: { userId: session.user.id, status: 'PENDING' },
        });
        if (existingRequest) {
            return NextResponse.json(
                { success: false, error: 'Ya tienes una solicitud pendiente' },
                { status: 400 }
            );
        }

        const providerRequest = await db.providerRequest.create({
            data: {
                userId: session.user.id,
                businessName: parsed.data.businessName,
                description: parsed.data.description,
                location: parsed.data.location,
                reason: parsed.data.reason,
            },
        });

        return NextResponse.json({
            success: true,
            providerRequest,
        });
    } catch (error) {
        console.error('Error creating provider request:', error);
        return NextResponse.json(
            { success: false, error: 'Error al enviar solicitud' },
            { status: 500 }
        );
    }
}
