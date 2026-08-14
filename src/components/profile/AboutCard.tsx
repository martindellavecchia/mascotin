'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AboutCardProps {
    bio?: string;
    onEdit?: () => void;
}

function isEmptyBio(bio?: string): boolean {
    if (!bio) return true;
    const trimmed = bio.trim();
    if (trimmed.length < 5) return true;
    if (/^(\w)\1+$/.test(trimmed)) return true;
    return false;
}

export function AboutCard({ bio, onEdit }: AboutCardProps) {
    const [expanded, setExpanded] = useState(false);
    const empty = isEmptyBio(bio);

    if (empty) {
        return (
            <Card className="shadow-sm border-0 bg-white">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <span className="material-symbols-rounded text-teal-500">info</span>
                        Sobre mí
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-500 text-sm mb-3">
                        Aún no has escrito tu biografía. Cuéntales a otros dueños un poco sobre ti.
                    </p>
                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 p-0 h-auto font-medium"
                            onClick={onEdit}
                        >
                            <span className="material-symbols-rounded text-base mr-1">edit</span>
                            Editar biografía
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

    const displayBio = bio!.trim();
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
                        <span className="material-symbols-rounded text-slate-400 text-sm ml-auto">
                            {expanded ? 'expand_less' : 'expand_more'}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-slate-600 leading-relaxed transition-all duration-300">
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
