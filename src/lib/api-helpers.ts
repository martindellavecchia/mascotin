import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Reusable API route helpers to eliminate auth/owner/pet check duplication.
 */

/** Get authenticated session or return 401 error response */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      ),
    } as const;
  }
  return { session, error: null } as const;
}

/** Get owner profile for authenticated user, or return error */
export async function requireOwner() {
  const auth = await requireAuth();
  if (auth.error) {
    return { session: null, owner: null, error: auth.error } as const;
  }

  const owner = await db.owner.findUnique({
    where: { userId: auth.session.user.id },
  });

  if (!owner) {
    return {
      session: auth.session,
      owner: null,
      error: NextResponse.json(
        { success: false, error: 'Perfil de dueño no encontrado' },
        { status: 404 }
      ),
    } as const;
  }

  return { session: auth.session, owner, error: null } as const;
}

/** Verify that a pet belongs to the current user */
export async function requirePetOwnership(petId: string) {
  const auth = await requireOwner();
  if (auth.error) {
    return { session: null, owner: null, pet: null, error: auth.error } as const;
  }

  const pet = await db.pet.findFirst({
    where: { id: petId, ownerId: auth.owner.id },
  });

  if (!pet) {
    return {
      session: auth.session,
      owner: auth.owner,
      pet: null,
      error: NextResponse.json(
        { success: false, error: 'Mascota no encontrada o no te pertenece' },
        { status: 403 }
      ),
    } as const;
  }

  return { session: auth.session, owner: auth.owner, pet, error: null } as const;
}
