'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AboutCardProps {
    bio?: string;
}

export function AboutCard({ bio }: AboutCardProps) {
    const [expanded, setExpanded] = useState(false);

    // Data Cleanup Logic
    let displayBio = bio;

    // Detectar basura como "11111111" o muy corto
    if (!displayBio || displayBio.length < 5 || /^(\w)\1+$/.test(displayBio)) {
        // Si es basura o muy corto, usar un default amigable
        displayBio = "¡Hola! Soy un amante de los animales. Me encanta pasar tiempo con mis mascotas y conocer nuevos amigos peludos. Cuido mucho los detalles y la seguridad.";
    }

    const isLongText = displayBio.length > 150;
    const content = expanded ? displayBio : displayBio.slice(0, 150) + (isLongText ? '...' : '');

    return (
        <Card className="shadow-sm border-0 bg-white">
            <CardHeader className="pb-2">
                <CardTitle
                    className="text-lg flex items-center gap-2 cursor-pointer hover:text-teal-600 transition-colors"
                    onClick={() => isLongText && setExpanded(!expanded)}
                >
                    <span className="material-symbols-rounded text-teal-500">info</span>
                    Sobre mí
                    {isLongText && (
                        <span className="material-symbols-rounded text-gray-400 text-sm ml-auto">
                            {expanded ? 'expand_less' : 'expand_more'}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-gray-600 leading-relaxed transition-all duration-300">
                    {content}
                </p>

                {isLongText && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50 p-0 h-auto font-medium"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? 'Leer menos' : 'Leer más'}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
