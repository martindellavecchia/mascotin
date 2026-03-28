import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - List all services with optional filtering
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const minRating = parseFloat(searchParams.get('minRating') || '0');
        const maxPrice = parseFloat(searchParams.get('maxPrice') || '0');
        const sortBy = searchParams.get('sortBy') || 'rating'; // rating, price_asc, price_desc

        const filters: any[] = [];

        if (search) {
            filters.push({
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { provider: { businessName: { contains: search, mode: 'insensitive' } } },
                ],
            });
        }

        if (category) {
            filters.push({
                OR: [
                    { name: { contains: category, mode: 'insensitive' } },
                    { description: { contains: category, mode: 'insensitive' } },
                ],
            });
        }

        if (maxPrice > 0) {
            filters.push({ price: { lte: maxPrice } });
        }

        // Build orderBy based on sortBy param
        let orderBy: any = { provider: { rating: 'desc' } };
        if (sortBy === 'price_asc') orderBy = { price: 'asc' };
        if (sortBy === 'price_desc') orderBy = { price: 'desc' };

        const services = await db.service.findMany({
            where: filters.length > 0 ? { AND: filters } : undefined,
            include: {
                provider: {
                    select: {
                        id: true,
                        businessName: true,
                        location: true,
                        rating: true,
                        reviewCount: true,
                    },
                },
            },
            orderBy,
        });

        const filteredServices = minRating > 0
            ? services.filter((service) => (service.provider?.rating || 0) >= minRating)
            : services;

        return NextResponse.json({
            success: true,
            services: filteredServices,
        });
    } catch (error) {
        console.error('Error fetching services:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch services' },
            { status: 500 }
        );
    }
}
