import { NextResponse } from 'next/server';
import { productEnabled } from '@/lib/product-flags';
export async function GET() {
  return NextResponse.json({
    savedSearches: productEnabled('SAVED_SEARCHES'),
    bookings: productEnabled('BOOKINGS'),
    meetups: productEnabled('MEETUPS'),
  });
}
