import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateSettingsSchema } from '@/lib/schemas';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        let settings = await db.userSettings.findUnique({
            where: { userId: session.user.id },
        });

        if (!settings) {
            settings = await db.userSettings.create({
                data: { userId: session.user.id },
            });
        }

        return NextResponse.json({
            success: true,
            settings: {
                ...settings,
                matchPetTypes: JSON.parse(settings.matchPetTypes),
                matchPetSizes: JSON.parse(settings.matchPetSizes),
            },
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener configuración' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = updateSettingsSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: 'Datos inválidos', details: parsed.error.issues }, { status: 400 });
        }

        const data: Record<string, unknown> = {};
        const d = parsed.data;
        if (d.theme !== undefined) data.theme = d.theme;
        if (d.matchingPaused !== undefined) data.matchingPaused = d.matchingPaused;
        if (d.matchDistance !== undefined) data.matchDistance = d.matchDistance;
        if (d.matchPetTypes !== undefined) data.matchPetTypes = JSON.stringify(d.matchPetTypes);
        if (d.matchPetSizes !== undefined) data.matchPetSizes = JSON.stringify(d.matchPetSizes);
        if (d.notifyMatches !== undefined) data.notifyMatches = d.notifyMatches;
        if (d.notifyMessages !== undefined) data.notifyMessages = d.notifyMessages;
        if (d.notifyComments !== undefined) data.notifyComments = d.notifyComments;
        if (d.notifyEvents !== undefined) data.notifyEvents = d.notifyEvents;
        if (d.notifyHealth !== undefined) data.notifyHealth = d.notifyHealth;
        if (d.profileVisible !== undefined) data.profileVisible = d.profileVisible;
        if (d.hideResolvedLostPets !== undefined) data.hideResolvedLostPets = d.hideResolvedLostPets;

        const settings = await db.userSettings.upsert({
            where: { userId: session.user.id },
            create: { userId: session.user.id, ...data },
            update: data,
        });

        return NextResponse.json({
            success: true,
            settings: {
                ...settings,
                matchPetTypes: JSON.parse(settings.matchPetTypes),
                matchPetSizes: JSON.parse(settings.matchPetSizes),
            },
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ success: false, error: 'Error al actualizar configuración' }, { status: 500 });
    }
}
