'use client';

import {
    Bone,
    Circle,
    Footprints,
    GraduationCap,
    Scissors,
    Users,
    Waves,
    type LucideIcon,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StepPersonalityProps {
    data: {
      energy?: string;
      activities?: string[];
      bio?: string;
      [key: string]: unknown;
    };
    updateData: (data: Record<string, unknown>) => void;
}

export default function StepPersonality({ data, updateData }: StepPersonalityProps) {
    const activitiesList: { id: string; label: string; icon: LucideIcon }[] = [
        { id: 'walk', label: 'Pasear', icon: Footprints },
        { id: 'play', label: 'Jugar', icon: Circle },
        { id: 'fetch', label: 'Buscar', icon: Bone },
        { id: 'swim', label: 'Nadar', icon: Waves },
        { id: 'socialize', label: 'Socializar', icon: Users },
        { id: 'groom', label: 'Aseo', icon: Scissors },
        { id: 'training', label: 'Entrenar', icon: GraduationCap },
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
                <h2 className="text-xl font-bold text-slate-900">Personalidad</h2>
                <p className="text-sm text-slate-500">¿Cómo es en el día a día?</p>
            </div>

            <div className="space-y-2">
                <Label>Nivel de energía</Label>
                <Select value={data.energy} onValueChange={(val) => updateData({ energy: val })}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="low">Baja (tranquilo)</SelectItem>
                        <SelectItem value="medium">Media (equilibrado)</SelectItem>
                        <SelectItem value="high">Alta (inquieto)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Actividades favoritas</Label>
                <div className="grid grid-cols-3 gap-2">
                    {activitiesList.map((act) => {
                        const ActivityIcon = act.icon;
                        return (
                        <button
                            key={act.id}
                            type="button"
                            onClick={() => toggleActivity(act.id)}
                            className={`p-2 rounded-lg border text-sm flex flex-col items-center gap-1 transition-all ${data.activities?.includes(act.id)
                                    ? 'bg-teal-50 border-teal-600 text-teal-700'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <ActivityIcon className="size-6 text-teal-700" aria-hidden="true" />
                            <span>{act.label}</span>
                        </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-2">
                <Label>Biografía corta</Label>
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
