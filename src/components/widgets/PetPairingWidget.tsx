'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PetPairingWidget() {
    const router = useRouter();

    return (
        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 overflow-hidden">
            <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-rounded text-2xl filled">favorite</span>
                    <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">PET MATCHING</span>
                </div>
                <h3 className="font-bold text-lg mb-1">Encuentra amigos de juego</h3>
                <p className="text-sm text-white/80 mb-4">Descubre mascotas compatibles cerca de ti.</p>

                <div className="flex -space-x-2 mb-4">
                    {['🐕', '🐈', '🐩'].map((emoji, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border-2 border-teal-500">
                            <span className="text-sm">{emoji}</span>
                        </div>
                    ))}
                </div>

                <Button
                    onClick={() => router.push('/?tab=explore')}
                    className="w-full bg-white text-teal-600 hover:bg-white/90 font-semibold"
                >
                    Buscar Matches
                </Button>
            </CardContent>
        </Card>
    );
}
