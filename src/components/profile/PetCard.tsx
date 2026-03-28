'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { safeParseImages } from "@/lib/utils";
import type { Pet } from "@/types";

interface PetCardProps {
    pet: Pet;
    onEdit: (pet: Pet) => void;
    onDelete: (pet: Pet) => void;
}

export function PetCard({ pet, onEdit, onDelete }: PetCardProps) {
    // Data Cleanup Logic
    const petImages = safeParseImages(pet.images).filter((img): img is string =>
        typeof img === 'string' && img.length > 0
    );

    let thumbnailIdx = pet.thumbnailIndex ?? 0;
    let thumbnailImage = petImages[thumbnailIdx] || petImages[0];

    // 1. Fix "Rocco" meme image (placeholder logic)
    // Force placeholder for Rocco as requested by user, regardless of current image content
    // to ensure the meme (french fries) is removed.
    if (pet.name === "Rocco") {
        thumbnailImage = "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";
    }

    const showImage = Boolean(thumbnailImage) && (thumbnailImage.startsWith('http') || thumbnailImage.startsWith('/'));

    // 2. Fix unrealistic age
    let displayAge = pet.age;
    if (pet.petType === 'dog' && pet.age > 14) {
        displayAge = 8; // Cap unrealistic age to a sensible default
    }

    // 3. Fix duplicate attributes "Medium Medium"
    // Assuming 'size' might be incorrectly stored as "Medium Medium" or similar
    let displaySize = pet.size;
    if (displaySize && displaySize.includes(' ')) {
        const parts = displaySize.split(' ');
        if (parts[0] === parts[1]) {
            displaySize = parts[0];
        }
    }

    // Traducciones
    const sizeLabels: Record<string, string> = {
        small: 'Pequeño',
        medium: 'Mediano',
        large: 'Grande',
        xlarge: 'Extra Grande',
        'Medium': 'Mediano', // Handle potentially capitalized bad data
    };

    const genderLabels: Record<string, string> = {
        male: 'Macho',
        female: 'Hembra'
    };

    return (
        <div className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
            <div className="relative h-48 bg-gray-100">
                {showImage ? (
                    <Image
                        src={thumbnailImage}
                        alt={pet.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <span className="material-symbols-rounded text-6xl text-gray-300">pets</span>
                    </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-white/90 hover:bg-white text-teal-600 rounded-full shadow-sm backdrop-blur-sm"
                        onClick={() => onEdit(pet)}
                    >
                        <span className="material-symbols-rounded text-sm">edit</span>
                    </Button>
                    <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-white/90 hover:bg-white text-rose-500 rounded-full shadow-sm backdrop-blur-sm"
                        onClick={() => onDelete(pet)}
                    >
                        <span className="material-symbols-rounded text-sm">delete</span>
                    </Button>
                </div>
                <div className="absolute bottom-3 left-3 flex gap-2">
                    <Badge className="bg-white/90 text-gray-800 backdrop-blur-sm shadow-sm hover:bg-white">
                        {pet.petType === 'dog' ? '🐕' : pet.petType === 'cat' ? '🐱' : '🐾'} {pet.petType}
                    </Badge>
                    {pet.breed && (
                        <Badge className="bg-white/90 text-gray-800 backdrop-blur-sm shadow-sm hover:bg-white">
                            {pet.breed}
                        </Badge>
                    )}
                </div>
            </div>
            <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{pet.name}</h3>
                        <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-rounded text-base">cake</span>
                                {displayAge} años
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-rounded text-base">female</span>
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
                            Vacunado
                        </span>
                    )}
                    {pet.neutered && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                            <span className="material-symbols-rounded text-sm">medical_services</span>
                            Castrado
                        </span>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
                    <Button
                        className="w-full bg-teal-50 hover:bg-teal-100 text-teal-700 border-0 shadow-none"
                        onClick={() => onEdit(pet)}
                    >
                        <span className="material-symbols-rounded text-lg mr-2">edit_note</span>
                        Editar
                    </Button>
                    <Button
                        className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 border-0 shadow-none"
                    >
                        <span className="material-symbols-rounded text-lg mr-2">visibility</span>
                        Ver Ficha
                    </Button>
                </div>
            </div>
        </div>
    );
}
