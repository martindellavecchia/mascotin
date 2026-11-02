import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withImageFields } from '@/lib/media';
import { PUBLIC_PET_SELECT, toPublicPet } from '@/lib/pet-dto';
import { ensurePetIdentity } from '@/lib/pet-payload';
import { canViewPublicPet } from '@/lib/server/pet-access';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Iniciá sesión para continuar' }, { status: 401 });
    }

    const { id } = await params;
    const ownPet = await db.pet.findFirst({
      where: { id, owner: { userId: session.user.id } },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            location: true,
            image: true,
          },
        },
        healthRecords: {
          orderBy: { dueDate: 'asc' },
          take: 50,
        },
      },
    });

    if (ownPet) {
      const identified = await ensurePetIdentity(ownPet);
      return NextResponse.json({
        success: true,
        pet: { ...withImageFields({ ...ownPet, ...identified }), isOwner: true },
      });
    }

    const pet = (await canViewPublicPet(session.user.id, id))
      ? await db.pet.findUnique({ where: { id }, select: PUBLIC_PET_SELECT })
      : null;

    if (!pet) {
      return NextResponse.json({ success: false, error: 'Mascota no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      pet: { ...toPublicPet(pet), isOwner: false, healthRecords: [] },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'No se pudo cargar el pasaporte' },
      { status: 500 }
    );
  }
}
