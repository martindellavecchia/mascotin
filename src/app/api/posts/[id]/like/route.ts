import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
        }

        const postId = params.id;
        const userId = session.user.id;

        // Wrap in transaction to prevent race conditions on simultaneous clicks
        const result = await prisma.$transaction(async (tx) => {
            const existingLike = await tx.like.findUnique({
                where: {
                    postId_userId: {
                        postId,
                        userId,
                    },
                },
            });

            if (existingLike) {
                await tx.like.delete({
                    where: { id: existingLike.id },
                });
                return { liked: false };
            } else {
                await tx.like.create({
                    data: { postId, userId },
                });
                return { liked: true };
            }
        });

        return NextResponse.json({ success: true, liked: result.liked });
    } catch (error) {
        console.error('Error toggling like:', error);
        return NextResponse.json({ success: false, error: 'Error al procesar like' }, { status: 500 });
    }
}
