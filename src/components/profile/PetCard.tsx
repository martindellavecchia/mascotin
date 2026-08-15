'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { safeParseImages } from "@/lib/utils";
import Link from "next/link";
import type { Pet } from "@/types";
import { shouldUnoptimizeImage } from "@/lib/media";

interface PetCardProps {
    pet: Pet;
    onEdit: (pet: Pet) => void;
    onDelete: (pet: Pet) => void;
}

export function PetCard({ pet, onEdit, onDelete }: PetCardProps) {
    const petImages = safeParseImages(pet.images).filter((img): img is string =>
        typeof img === 'string' && img.length > 0
    );

    const thumbnailIdx = pet.thumbnailIndex ?? 0;
    const thumbnailImage = petImages[thumbnailIdx] || petImages[0];
    const showImage = Boolean(thumbnailImage) && (thumbnailImage.startsWith('http') || thumbnailImage.startsWith('/'));

    let displaySize = pet.size;
    if (displaySize && displaySize.includes(' ')) {
        const parts = displaySize.split(' ');
        if (parts[0] === parts[1]) {
            displaySize = parts[0];
        }
    }

    const sizeLabels: Record<string, string> = {
        small: 'Pequeño',
        medium: 'Mediano',
        large: 'Grande',
        xlarge: 'Extra Grande',
        'Medium': 'Mediano',
    };

    const genderLabels: Record<string, string> = {
        male: 'Macho',
        female: 'Hembra'
    };

    const genderIcon = pet.gender === 'male' ? 'male' : 'female';
    const isFemale = pet.gender === 'female';

    return (
        <div className="group bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
            <div className="relative h-48 bg-slate-100">
                {showImage ? (
                    <Image
                        src={thumbnailImage}
                        alt={pet.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized={shouldUnoptimizeImage(thumbnailImage)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                        <span className="material-symbols-rounded text-6xl text-slate-300">pets</span>
                    </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                    <Button
                        size="icon"
                        variant="secondary"
                        className="rounded-full bg-white/90 text-red-600 shadow-sm backdrop-blur-sm hover:bg-white"
                        onClick={() => onDelete(pet)}
                        aria-label="Eliminar mascota"
                    >
                        <span className="material-symbols-rounded text-sm">delete</span>
                    </Button>
                </div>
                <div className="absolute bottom-3 left-3 flex gap-2 max-w-[calc(100%-1.5rem)]">
                    <Badge className="bg-white/90 text-slate-800 backdrop-blur-sm shadow-sm hover:bg-white gap-1 shrink-0">
                        <span className="material-symbols-rounded text-sm text-teal-700">pets</span>
                        {pet.petType === 'dog' ? 'Perro' : pet.petType === 'cat' ? 'Gato' : pet.petType === 'bird' ? 'Ave' : 'Otro'}
                    </Badge>
                    {pet.breed && (
                        <Badge className="bg-white/90 text-slate-800 backdrop-blur-sm shadow-sm hover:bg-white max-w-[9rem] truncate">
                            {pet.breed}
                        </Badge>
                    )}
                </div>
            </div>
            <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">{pet.name}</h3>
                        <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-rounded text-base">cake</span>
                                {pet.age} años
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-rounded text-base">{genderIcon}</span>
                                {genderLabels[pet.gender] || pet.gender}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-rounded text-base">straighten</span>
                                {sizeLabels[displaySize.toLowerCase()] || displaySize}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {pet.vaccinated && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-medium">
                            <span className="material-symbols-rounded text-sm">vaccines</span>
                            {isFemale ? 'Vacunada' : 'Vacunado'}
                        </span>
                    )}
                    {pet.neutered && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-medium border border-teal-200">
                            <span className="material-symbols-rounded text-sm">medical_services</span>
                            {isFemale ? 'Castrada' : 'Castrado'}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
                    <Button
                        className="w-full bg-teal-50 hover:bg-teal-100 text-teal-700 border-0 shadow-none"
                        onClick={() => onEdit(pet)}
                    >
                        <span className="material-symbols-rounded text-lg mr-2">edit_note</span>
                        Editar
                    </Button>
                    <Button
                        className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border-0 shadow-none"
                        asChild
                    >
                        <Link href={`/pets/${pet.id}`}>
                            <span className="material-symbols-rounded text-lg mr-2">visibility</span>
                            Ver pasaporte
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
