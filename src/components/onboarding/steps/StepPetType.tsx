'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { PetTypeIcon } from '@/components/PetTypeIcon';
import { cn } from '@/lib/utils';

interface StepPetTypeProps {
    value: string;
    onChange: (value: string) => void;
}

export default function StepPetType({ value, onChange }: StepPetTypeProps) {
    const types = [
        { id: 'dog', label: 'Perro', color: 'bg-teal-50 border-teal-200 hover:border-teal-500' },
        { id: 'cat', label: 'Gato', color: 'bg-slate-50 border-slate-200 hover:border-teal-500' },
        { id: 'bird', label: 'Ave', color: 'bg-slate-50 border-slate-200 hover:border-teal-500' },
        { id: 'other', label: 'Otro', color: 'bg-slate-50 border-slate-200 hover:border-teal-500' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Empecemos</h2>
                <p className="text-slate-600">¿Qué tipo de mascota tienes?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {types.map((type) => (
                    <motion.button
                        key={type.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onChange(type.id)}
                        className={cn(
                            "relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all h-40",
                            type.color,
                            value === type.id
                              ? 'ring-2 ring-teal-600 ring-offset-2 border-teal-600 shadow-sm'
                              : 'opacity-90 hover:opacity-100'
                        )}
                    >
                        <PetTypeIcon petType={type.id} className="size-12 mb-3 text-teal-700" />
                        <span className="font-semibold text-slate-800">{type.label}</span>
                        {value === type.id && (
                            <div className="absolute top-3 right-3 bg-teal-600 text-white rounded-full p-1">
                                <Check className="size-4" aria-hidden="true" />
                            </div>
                        )}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
