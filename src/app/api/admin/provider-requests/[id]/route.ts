import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { reviewProviderRequestSchema } from '@/lib/schemas';
import { createNotification } from '@/lib/notifications';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    try {
        const { id } = await params;
        const body = await request.json();
        const parsed = reviewProviderRequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Datos inválidos', details: parsed.error.issues },
                { status: 400 }
            );
        }

        const providerRequest = await db.providerRequest.findUnique({
            where: { id },
        });

        if (!providerRequest) {
            return NextResponse.json(
                { success: false, error: 'Solicitud no encontrada' },
                { status: 404 }
            );
        }

        if (providerRequest.status !== 'PENDING') {
            return NextResponse.json(
                { success: false, error: 'Esta solicitud ya fue procesada' },
                { status: 400 }
            );
        }

        const session = await getServerSession(authOptions);

        if (parsed.data.status === 'APPROVED') {
            await db.$transaction([
                db.providerRequest.update({
                    where: { id },
                    data: {
                        status: 'APPROVED',
                        adminNote: parsed.data.adminNote,
                        reviewedAt: new Date(),
                    },
                }),
                db.providerProfile.create({
                    data: {
                        userId: providerRequest.userId,
                        businessName: providerRequest.businessName,
                        description: providerRequest.description,
                        location: providerRequest.location,
                    },
                }),
                db.user.update({
                    where: { id: providerRequest.userId },
                    data: { role: 'PROVIDER' },
                }),
            ]);

            createNotification({
                userId: providerRequest.userId,
                actorId: session?.user?.id || providerRequest.userId,
                type: 'PROVIDER_REQUEST',
                title: 'Solicitud aprobada',
                body: '¡Tu solicitud de proveedor fue aprobada! Ya puedes gestionar tu tienda.',
                link: '/provider',
                entityId: id,
            }).catch(console.error);
        } else {
            await db.providerRequest.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    adminNote: parsed.data.adminNote,
                    reviewedAt: new Date(),
                },
            });

            createNotification({
                userId: providerRequest.userId,
                actorId: session?.user?.id || providerRequest.userId,
                type: 'PROVIDER_REQUEST',
                title: 'Solicitud rechazada',
                body: 'Tu solicitud de proveedor fue rechazada.' + (parsed.data.adminNote ? ` Nota: ${parsed.data.adminNote}` : ''),
                link: '/settings',
                entityId: id,
            }).catch(console.error);
        }

        const updated = await db.providerRequest.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        return NextResponse.json({ success: true, providerRequest: updated });
    } catch (error) {
        console.error('Error reviewing provider request:', error);
        return NextResponse.json(
            { success: false, error: 'Error al procesar solicitud' },
            { status: 500 }
        );
    }
}
