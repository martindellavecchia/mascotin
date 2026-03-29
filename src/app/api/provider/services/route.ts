import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { storeServiceSchema } from '@/lib/schemas';

// GET - Get all services for current provider
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
        });

        if (!provider) {
            return NextResponse.json(
                { success: false, error: 'Not a provider' },
                { status: 403 }
            );
        }

        const services = await db.service.findMany({
            where: { providerId: provider.id },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { appointments: true },
                },
            },
        });

        return NextResponse.json({
            success: true,
            services,
        });
    } catch (error) {
        console.error('Error fetching services:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch services' },
            { status: 500 }
        );
    }
}

// POST - Create a new service
export async function POST(request: Request) {
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
        });

        if (!provider) {
            return NextResponse.json(
                { success: false, error: 'Not a provider. Please register as a provider first.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const parsed = storeServiceSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Datos inválidos', details: parsed.error.issues },
                { status: 400 }
            );
        }

        const { name, description, price, duration } = parsed.data;

        const service = await db.service.create({
            data: {
                providerId: provider.id,
                name,
                description,
                price,
                duration,
            },
        });

        return NextResponse.json({
            success: true,
            service,
        });
    } catch (error) {
        console.error('Error creating service:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create service' },
            { status: 500 }
        );
    }
}
