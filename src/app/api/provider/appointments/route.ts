import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get all appointments for the provider's services
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Get provider profile
        const provider = await db.providerProfile.findUnique({
            where: { userId: session.user.id },
            include: { services: { select: { id: true } } },
        });

        if (!provider) {
            return NextResponse.json(
                { success: false, error: 'Not a provider' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const upcoming = searchParams.get('upcoming') === 'true';

        const serviceIds = provider.services.map(s => s.id);

        const where: Prisma.AppointmentWhereInput = {
            serviceId: { in: serviceIds },
        };

        if (status) {
            where.status = status;
        }

        if (upcoming) {
            where.date = { gte: new Date() };
        }

        const appointments = await db.appointment.findMany({
            where,
            orderBy: { date: 'asc' },
            include: {
                service: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        duration: true,
                    },
                },
                pet: {
                    select: {
                        id: true,
                        name: true,
                        petType: true,
                        breed: true,
                        images: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
        });

        // Count by status
        const counts = await db.appointment.groupBy({
            by: ['status'],
            where: {
                serviceId: { in: serviceIds },
                date: { gte: new Date() },
            },
            _count: true,
        });

        const statusCounts = {
            PENDING: 0,
            CONFIRMED: 0,
            CANCELLED: 0,
            COMPLETED: 0,
        };

        counts.forEach(c => {
            statusCounts[c.status as keyof typeof statusCounts] = c._count;
        });

        return NextResponse.json({
            success: true,
            appointments,
            counts: statusCounts,
        });
    } catch (error) {
        console.error('Error fetching provider appointments:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch appointments' },
            { status: 500 }
        );
    }
}
