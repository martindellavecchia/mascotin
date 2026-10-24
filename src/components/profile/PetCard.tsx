'use client';

import Image from "next/image";
import Link from "next/link";
import {
    Cake,
    Eye,
    FilePen,
    Mars,
    Ruler,
    Trash2,
    Venus,
    type LucideIcon,
} from "lucide-react";
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

    const typeLine = [getOptionLabel(PET_TYPE_LABELS, pet.petType) ?? 'Otro', pet.breed].filter(Boolean).join(' · ');

    return (
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
            <div className="relative h-48 bg-muted">
                {showImage ? (
                    <Image
                        src={thumbnailImage}
                        alt={pet.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 420px"
                        unoptimized={shouldUnoptimizeImage(thumbnailImage)}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary-soft">
                        <PetTypeIcon petType={pet.petType} className="size-14 text-primary/30" />
                    </div>
                )}
            </div>
            <div className="flex flex-1 flex-col p-5">
                <h3 className="text-xl font-bold text-foreground">{pet.name}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{typeLine}</p>
                {facts.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
                        {facts.map((fact, index) => (
                            <span key={fact.key} className="flex items-center gap-2">
                                {index > 0 && <span aria-hidden="true">·</span>}
                                <span className="flex items-center gap-1">
                                    <fact.icon className="size-4" aria-hidden="true" />
                                    {fact.label}
                                </span>
                            </span>
                        ))}
                    </div>
                )}

                {(pet.vaccinated || pet.neutered) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {pet.vaccinated && (
                            <span className="rounded-md bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                                {isFemale ? 'Vacunada' : 'Vacunado'}
                            </span>
                        )}
                        {pet.neutered && (
                            <span className="rounded-md bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                                {isFemale ? 'Castrada' : 'Castrado'}
                            </span>
                        )}
                    </div>
                )}

                <div className="min-h-5 flex-1" aria-hidden="true" />
                <div className="flex items-center gap-2 border-t border-border pt-4">
                    <Button asChild variant="outline" className="flex-1">
                        <Link href={`/pets/${pet.id}`}>
                            <Eye className="size-4" aria-hidden="true" />
                            Ver pasaporte
                        </Link>
                    </Button>
                    <Button variant="ghost" className="flex-1 text-primary" onClick={() => onEdit(pet)}>
                        <FilePen className="size-4" aria-hidden="true" />
                        Editar
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="shrink-0 text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                        onClick={() => onDelete(pet)}
                        aria-label="Eliminar mascota"
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
