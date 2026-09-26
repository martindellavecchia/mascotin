'use client';

import { useId, useState } from 'react';
import { ChevronDown, ChevronUp, Info, Pencil } from "lucide-react";
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
    const contentId = useId();
    const empty = isEmptyBio(bio);

    if (empty) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Info className="size-5 text-teal-500" aria-hidden="true" />
                        Sobre mí
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-500 text-sm mb-3">
                        Todavía no escribiste tu biografía. Contale a la comunidad un poco sobre vos.
                    </p>
                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 p-0 h-auto font-medium"
                            onClick={onEdit}
                        >
                            <Pencil className="size-4 mr-1" aria-hidden="true" />
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
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                    {isLongText ? (
                        <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md text-left transition-colors hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                            onClick={() => setExpanded(!expanded)}
                            aria-expanded={expanded}
                            aria-controls={contentId}
                        >
                            <Info className="size-5 text-teal-500" aria-hidden="true" />
                            Sobre mí
                            {expanded ? (
                                <ChevronUp className="size-4 text-slate-400 ml-auto" aria-hidden="true" />
                            ) : (
                                <ChevronDown className="size-4 text-slate-400 ml-auto" aria-hidden="true" />
                            )}
                        </button>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Info className="size-5 text-teal-500" aria-hidden="true" />
                            Sobre mí
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p id={contentId} className="text-slate-600 leading-relaxed transition-all duration-300">
                    {content}
                </p>

                {isLongText && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50 p-0 h-auto font-medium"
                        onClick={() => setExpanded(!expanded)}
                        aria-expanded={expanded}
                        aria-controls={contentId}
                    >
                        {expanded ? 'Leer menos' : 'Leer más'}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
