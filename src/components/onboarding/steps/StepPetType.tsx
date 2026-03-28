'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StepPetTypeProps {
    value: string;
    onChange: (value: string) => void;
}

export default function StepPetType({ value, onChange }: StepPetTypeProps) {
    const types = [
        { id: 'dog', label: 'Perro', emoji: '🐕', color: 'bg-blue-50 border-blue-200 hover:border-blue-400' },
        { id: 'cat', label: 'Gato', emoji: '🐱', color: 'bg-orange-50 border-orange-200 hover:border-orange-400' },
        { id: 'bird', label: 'Ave', emoji: '🐦', color: 'bg-yellow-50 border-yellow-200 hover:border-yellow-400' },
        { id: 'other', label: 'Otro', emoji: '🐾', color: 'bg-gray-50 border-gray-200 hover:border-gray-400' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Empecemos!</h2>
                <p className="text-gray-600">¿Qué tipo de mascota tienes?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {types.map((type) => (
                    <motion.button
                        key={type.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onChange(type.id)}
                        className={cn(
                            "relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all h-40",
                            type.color,
                            value === type.id ? 'ring-2 ring-teal-500 ring-offset-2 border-transparent scale-105 shadow-md' : 'opacity-80 hover:opacity-100'
                        )}
                    >
                        <span className="text-5xl mb-3">{type.emoji}</span>
                        <span className="font-bold text-gray-700">{type.label}</span>
                        {value === type.id && (
                            <div className="absolute top-3 right-3 bg-teal-500 text-white rounded-full p-1">
                                <span className="material-symbols-rounded text-sm font-bold">check</span>
                            </div>
                        )}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
