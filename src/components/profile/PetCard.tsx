'use client';

import Image from "next/image";
import Link from "next/link";
import {
    Cake,
    Eye,
    FilePen,
    Mars,
    Ruler,
    Stethoscope,
    Syringe,
    Trash2,
    Venus,
    type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PetTypeIcon } from "@/components/PetTypeIcon";
import type { Pet } from "@/types";
import { getPrimaryImageUrl, isRenderableImage, shouldUnoptimizeImage } from "@/lib/media";
import {
    PET_GENDER_LABELS,
    PET_SIZE_LABELS,
    PET_TYPE_LABELS,
    getOptionLabel,
    getPetAgeLabel,
} from "@/lib/pet-display";

interface PetCardProps {
    pet: Pet;
    onEdit: (pet: Pet) => void;
    onDelete: (pet: Pet) => void;
}

export function PetCard({ pet, onEdit, onDelete }: PetCardProps) {
    const thumbnailImage = getPrimaryImageUrl(pet.images, pet.thumbnailIndex);
    const showImage = isRenderableImage(thumbnailImage);

    let displaySize = pet.size;
    if (displaySize && displaySize.includes(' ')) {
        const parts = displaySize.split(' ');
        if (parts[0] === parts[1]) {
            displaySize = parts[0];
        }
    }

    const ageLabel = getPetAgeLabel(pet);
    const genderLabel = getOptionLabel(PET_GENDER_LABELS, pet.gender);
    const sizeLabel = getOptionLabel(PET_SIZE_LABELS, displaySize);
    const GenderIcon = pet.gender === 'male' ? Mars : Venus;
    const isFemale = pet.gender === 'female';
    const facts = [
        ageLabel && { key: 'age', icon: Cake, label: ageLabel },
        genderLabel && { key: 'gender', icon: GenderIcon, label: genderLabel },
        sizeLabel && { key: 'size', icon: Ruler, label: sizeLabel },
    ].filter((fact): fact is { key: string; icon: LucideIcon; label: string } => Boolean(fact));

    return (
        <div className="group overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-primary/35">
            <div className="relative h-48 bg-slate-100">
                {showImage ? (
                    <Image
                        src={thumbnailImage}
                        alt={pet.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 420px"
                        unoptimized={shouldUnoptimizeImage(thumbnailImage)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                        <PetTypeIcon petType={pet.petType} className="size-16 text-slate-300" />
                    </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                    <Button
                        size="icon"
                        variant="secondary"
                        className="rounded-lg bg-white/90 text-red-600 backdrop-blur-sm hover:bg-white"
                        onClick={() => onDelete(pet)}
                        aria-label="Eliminar mascota"
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                </div>
                <div className="absolute bottom-3 left-3 flex gap-2 max-w-[calc(100%-1.5rem)]">
                    <Badge className="shrink-0 gap-1 bg-white/90 text-slate-800 backdrop-blur-sm hover:bg-white">
                        <PetTypeIcon petType={pet.petType} className="size-4 text-teal-700" />
                        {getOptionLabel(PET_TYPE_LABELS, pet.petType) ?? 'Otro'}
                    </Badge>
                    {pet.breed && (
                        <Badge className="max-w-[9rem] truncate bg-white/90 text-slate-800 backdrop-blur-sm hover:bg-white">
                            {pet.breed}
                        </Badge>
                    )}
                </div>
            </div>
            <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">{pet.name}</h3>
                        {facts.length > 0 && (
                            <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                                {facts.map((fact, index) => (
                                    <span key={fact.key} className="flex items-center gap-2">
                                        {index > 0 && <span aria-hidden="true">•</span>}
                                        <span className="flex items-center gap-1">
                                            <fact.icon className="size-4" aria-hidden="true" />
                                            {fact.label}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {pet.vaccinated && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-medium">
                            <Syringe className="size-4" aria-hidden="true" />
                            {isFemale ? 'Vacunada' : 'Vacunado'}
                        </span>
                    )}
                    {pet.neutered && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-medium border border-teal-200">
                            <Stethoscope className="size-4" aria-hidden="true" />
                            {isFemale ? 'Castrada' : 'Castrado'}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
                    <Button
                        className="w-full bg-teal-50 hover:bg-teal-100 text-teal-700 border-0 shadow-none"
                        onClick={() => onEdit(pet)}
                    >
                        <FilePen className="size-5 mr-2" aria-hidden="true" />
                        Editar
                    </Button>
                    <Button
                        className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border-0 shadow-none"
                        asChild
                    >
                        <Link href={`/pets/${pet.id}`}>
                            <Eye className="size-5 mr-2" aria-hidden="true" />
                            Ver pasaporte
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
