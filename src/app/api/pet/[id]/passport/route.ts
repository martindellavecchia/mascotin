import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withImageFields } from '@/lib/media';
import { ensurePetIdentity } from '@/lib/pet-payload';

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
    const pet = await db.pet.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            location: true,
            image: true,
            userId: true,
          },
        },
        healthRecords: {
          orderBy: { dueDate: 'asc' },
          take: 50,
        },
      },
    });

    if (!pet) {
      return NextResponse.json({ success: false, error: 'Mascota no encontrada' }, { status: 404 });
    }

    const identified = await ensurePetIdentity(pet);
    const isOwner = pet.owner.userId === session.user.id;
    const { userId: _ownerUserId, ...owner } = pet.owner;
    const payload = withImageFields({ ...pet, ...identified, owner });

    return NextResponse.json({
      success: true,
      pet: isOwner
        ? { ...payload, isOwner }
        : { ...payload, isOwner, healthRecords: [], microchipId: null, emergencyToken: null },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'No se pudo cargar el pasaporte' },
      { status: 500 }
    );
  }
}
