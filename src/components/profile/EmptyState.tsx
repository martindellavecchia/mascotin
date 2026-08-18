'use client';

import { Plus, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
    onAddPet: () => void;
}

export function EmptyState({ onAddPet }: EmptyStateProps) {
    return (
        <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-12 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-primary-soft">
                <PawPrint className="size-7 text-primary" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Todavía no tenés mascotas
            </h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                Registrá tu primera mascota para empezar a conocer otras personas de la comunidad.
            </p>
            <Button onClick={onAddPet}>
                <Plus className="size-5 mr-2" aria-hidden="true" />
                Registrar mascota
            </Button>
        </div>
    );
}
