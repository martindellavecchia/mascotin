import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractPassportFields, resolveCoordinates } from '@/lib/pet-payload';
import { normalizePetImageSelection } from '@/lib/media';

// GET - Get pet by ID
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const [pet, viewer] = await Promise.all([
            db.pet.findUnique({
                where: { id },
                include: { owner: { include: { user: { select: { syntheticRunId: true } } } } },
            }),
            db.user.findUnique({ where: { id: session.user.id }, select: { syntheticRunId: true } }),
        ]);

        if (!pet || pet.owner.user.syntheticRunId !== (viewer?.syntheticRunId || null)) {
            return NextResponse.json(
                { success: false, error: 'Pet not found' },
                { status: 404 }
            );
        }

        const { user: _ownerUser, ...owner } = pet.owner;
        return NextResponse.json({ success: true, pet: { ...pet, owner } });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to fetch pet' },
            { status: 500 }
        );
    }
}

// PUT - Update pet
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json();

        // Verify ownership
        const pet = await db.pet.findUnique({
            where: { id },
            include: { owner: true },
        });

        if (!pet) {
            return NextResponse.json(
                { success: false, error: 'Pet not found' },
                { status: 404 }
            );
        }

        if (pet.owner.userId !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Not authorized to edit this pet' },
                { status: 403 }
            );
        }

        const {
            name,
            petType,
            breed,
            age,
            weight,
            size,
            gender,
            vaccinated,
            neutered,
            energy,
            bio,
            activities,
            location,
            images,
            thumbnailIndex,
            isActive,
        } = body;

        const passport = extractPassportFields(body);
        const coords = location
          ? await resolveCoordinates(location, pet.latitude, pet.longitude)
          : null;
        const shouldUpdateImages = images !== undefined || thumbnailIndex !== undefined;
        const imageSelection = shouldUpdateImages
          ? normalizePetImageSelection(
              images !== undefined ? images : pet.images,
              thumbnailIndex !== undefined ? thumbnailIndex : pet.thumbnailIndex
            )
          : null;

        if (shouldUpdateImages && !imageSelection) {
            return NextResponse.json(
                { success: false, error: 'Formato de imágenes inválido' },
                { status: 400 }
            );
        }

        const updatedPet = await db.pet.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(petType !== undefined && { petType }),
                ...(breed !== undefined && { breed }),
                ...(age !== undefined && { age }),
                ...(weight !== undefined && { weight: weight === null ? null : parseFloat(weight) }),
                ...(size !== undefined && { size }),
                ...(gender !== undefined && { gender }),
                ...(vaccinated !== undefined && { vaccinated }),
                ...(neutered !== undefined && { neutered }),
                ...(energy !== undefined && { energy }),
                ...(bio !== undefined && { bio }),
                ...(activities !== undefined && { activities: typeof activities === 'string' ? activities : JSON.stringify(activities) }),
                ...(location !== undefined && { location }),
                ...(imageSelection && {
                    images: JSON.stringify(imageSelection.images),
                    thumbnailIndex: imageSelection.thumbnailIndex,
                }),
                ...(isActive !== undefined && { isActive }),
                ...(coords && { latitude: coords.latitude, longitude: coords.longitude }),
                ...Object.fromEntries(
                  Object.entries(passport).filter(([, value]) => value !== undefined)
                ),
            },
        });

        return NextResponse.json({ success: true, pet: updatedPet });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to update pet' },
            { status: 500 }
        );
    }
}

// DELETE - Delete pet
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const { id } = await params;

        // Verify ownership
        const pet = await db.pet.findUnique({
            where: { id },
            include: { owner: true },
        });

        if (!pet) {
            return NextResponse.json(
                { success: false, error: 'Pet not found' },
                { status: 404 }
            );
        }

        if (pet.owner.userId !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Not authorized to delete this pet' },
                { status: 403 }
            );
        }

        await db.pet.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, message: 'Pet deleted successfully' });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to delete pet' },
            { status: 500 }
        );
    }
}
