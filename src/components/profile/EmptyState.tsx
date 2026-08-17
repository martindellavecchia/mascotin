'use client';

import { Plus, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
    onAddPet: () => void;
}

export function EmptyState({ onAddPet }: EmptyStateProps) {
    return (
        <div className="text-center py-12">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PawPrint className="size-10 text-teal-500" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Aún no tienes mascotas
            </h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                Registra tu primera mascota para encontrar amigos peludos
            </p>
            <Button
                onClick={onAddPet}
                className="bg-teal-500 hover:bg-teal-600 text-white rounded-full px-6"
            >
                <Plus className="size-5 mr-2" aria-hidden="true" />
                Registrar Mascota
            </Button>
        </div>
    );
}
