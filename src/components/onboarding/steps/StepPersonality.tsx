'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StepPersonalityProps {
    data: any;
    updateData: (data: any) => void;
}

export default function StepPersonality({ data, updateData }: StepPersonalityProps) {
    const activitiesList = [
        { id: 'walk', label: 'Pasear', emoji: '🚶' },
        { id: 'play', label: 'Jugar', emoji: '🎾' },
        { id: 'fetch', label: 'Buscar', emoji: '🦴' },
        { id: 'swim', label: 'Nadar', emoji: '🏊' },
        { id: 'nap', label: 'Dormir', emoji: '💤' },
        { id: 'socialize', label: 'Socializar', emoji: '🐕' },
    ];

    const toggleActivity = (id: string) => {
        const current = data.activities || [];
        if (current.includes(id)) {
            updateData({ activities: current.filter((a: string) => a !== id) });
        } else {
            updateData({ activities: [...current, id] });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Personalidad</h2>
                <p className="text-sm text-gray-500">¿Cómo es en el día a día?</p>
            </div>

            <div className="space-y-2">
                <Label>Nivel de Energía</Label>
                <Select value={data.energy} onValueChange={(val) => updateData({ energy: val })}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="low">😴 Baja (Tranquilo)</SelectItem>
                        <SelectItem value="medium">🙂 Media (Equilibrado)</SelectItem>
                        <SelectItem value="high">⚡ Alta (Inquieto)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Actividades Favoritas</Label>
                <div className="grid grid-cols-3 gap-2">
                    {activitiesList.map(act => (
                        <button
                            key={act.id}
                            onClick={() => toggleActivity(act.id)}
                            className={`p-2 rounded-lg border text-sm flex flex-col items-center gap-1 transition-all ${data.activities?.includes(act.id)
                                    ? 'bg-teal-50 border-teal-500 text-teal-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <span className="text-xl">{act.emoji}</span>
                            <span>{act.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label>Biografía Corta</Label>
                <Textarea
                    placeholder="Le gusta perseguir mariposas y dormir al sol..."
                    value={data.bio}
                    onChange={(e) => updateData({ bio: e.target.value })}
                    className="resize-none"
                    rows={3}
                />
            </div>
        </div>
    );
}
