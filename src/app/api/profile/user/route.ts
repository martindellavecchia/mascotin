import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { z } from 'zod';

const createProfileSchema = z.object({
  name: z.string().min(2),
  bio: z.string().min(10).max(500),
  age: z.number().min(18).max(100),
  gender: z.enum(['male', 'female']),
  location: z.string().min(2),
  interests: z.string().min(1),
  images: z.string(),
  userId: z.string(),
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
  }

  try {
    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ 
        profile: null, 
        hasProfile: false 
      });
    }

    return NextResponse.json({ 
      profile: { 
        ...profile, 
        images: profile.images 
      }, 
      hasProfile: true 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error fetching profile' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = createProfileSchema.parse(body);

    const existingProfile = await db.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (existingProfile) {
      return NextResponse.json({ success: false, error: 'Ya tienes un perfil' }, { status: 400 });
    }

    const profile = await db.profile.create({
      data: {
        userId: session.user.id,
        name: validatedData.name,
        bio: validatedData.bio,
        age: validatedData.age,
        gender: validatedData.gender,
        location: validatedData.location,
        interests: validatedData.interests,
        images: validatedData.images,
      },
    });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error creating profile' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = createProfileSchema.parse(body);

    const profile = await db.profile.update({
      where: { userId: session.user.id },
      data: {
        name: validatedData.name,
        bio: validatedData.bio,
        age: validatedData.age,
        gender: validatedData.gender,
        location: validatedData.location,
        interests: validatedData.interests,
        images: validatedData.images,
      },
    });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error updating profile' }, { status: 500 });
  }
}
