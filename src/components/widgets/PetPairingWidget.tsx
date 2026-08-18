'use client';

import { useRouter } from 'next/navigation';
import { Cat, Dog, Heart, PawPrint } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PetPairingWidget() {
    const router = useRouter();

    return (
        <Card className="overflow-hidden border-primary bg-primary text-white">
            <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                    <Heart className="size-7 fill-current" aria-hidden="true" />
                    <span className="rounded-sm bg-white/15 px-2 py-0.5 text-xs font-medium">ENCUENTROS</span>
                </div>
                <h3 className="font-bold text-lg mb-1">Encontrá compañeros de juego</h3>
                <p className="text-sm text-white/80 mb-4">Descubrí mascotas compatibles cerca tuyo.</p>

                <div className="mb-4 flex gap-2" aria-hidden="true">
                    {[Dog, Cat, PawPrint].map((Icon, index) => (
                        <span key={index} className="flex size-9 items-center justify-center rounded-full border border-white/25 bg-white/10">
                            <Icon className="size-5" />
                        </span>
                    ))}
                </div>

                <Button
                    onClick={() => router.push('/inicio?tab=explore')}
                    className="w-full bg-white text-teal-600 hover:bg-white/90 font-semibold"
                >
                    Descubrir mascotas
                </Button>
            </CardContent>
        </Card>
    );
}
