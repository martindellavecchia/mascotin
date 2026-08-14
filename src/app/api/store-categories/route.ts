import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const categories = await db.storeCategory.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching store categories:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudieron obtener las categorías' },
      { status: 500 }
    );
  }
}
