'use client';

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
    onAddPet: () => void;
}

export function EmptyState({ onAddPet }: EmptyStateProps) {
    return (
        <div className="text-center py-12">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-rounded text-4xl text-teal-500">pets</span>
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
                <span className="material-symbols-rounded text-lg mr-2">add</span>
                Registrar Mascota
            </Button>
        </div>
    );
}
