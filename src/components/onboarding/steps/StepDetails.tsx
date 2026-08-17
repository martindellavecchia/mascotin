'use client';

import { Stethoscope, Syringe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StepDetailsProps {
    data: any;
    updateData: (data: any) => void;
}

export default function StepDetails({ data, updateData }: StepDetailsProps) {
    const isFemale = data.gender === 'female';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Detalles Físicos</h2>
                <p className="text-sm text-slate-500">Para encontrarle los mejores amigos</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Edad (años)</Label>
                    <Input
                        type="number"
                        min="0"
                        value={data.age}
                        onChange={(e) => updateData({ age: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Peso (kg)</Label>
                    <Input
                        type="number"
                        min="0"
                        value={data.weight}
                        onChange={(e) => updateData({ weight: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Tamaño</Label>
                <Select value={data.size} onValueChange={(val) => updateData({ size: val })}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="small">Pequeño (0-10kg)</SelectItem>
                        <SelectItem value="medium">Mediano (10-25kg)</SelectItem>
                        <SelectItem value="large">Grande (25-45kg)</SelectItem>
                        <SelectItem value="xlarge">Extra Grande (+45kg)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-3 pt-2">
                <Label>Salud</Label>
                <div className="flex gap-4">
                    <label
                        className={`flex items-center gap-3 cursor-pointer px-4 py-3 border rounded-lg flex-1 transition-all ${
                            data.vaccinated
                                ? 'bg-teal-50 border-teal-300'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <input
                            type="checkbox"
                            checked={data.vaccinated}
                            onChange={(e) => updateData({ vaccinated: e.target.checked })}
                            className="sr-only"
                        />
                        <Syringe className={`size-6 ${data.vaccinated ? 'text-teal-600' : 'text-slate-400'}`} aria-hidden="true" />
                        <span className={`text-sm font-medium ${data.vaccinated ? 'text-teal-700' : 'text-slate-700'}`}>
                            {isFemale ? 'Vacunada' : 'Vacunado'}
                        </span>
                    </label>
                    <label
                        className={`flex items-center gap-3 cursor-pointer px-4 py-3 border rounded-lg flex-1 transition-all ${
                            data.neutered
                                ? 'bg-teal-50 border-teal-300'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <input
                            type="checkbox"
                            checked={data.neutered}
                            onChange={(e) => updateData({ neutered: e.target.checked })}
                            className="sr-only"
                        />
                        <Stethoscope className={`size-6 ${data.neutered ? 'text-teal-600' : 'text-slate-400'}`} aria-hidden="true" />
                        <span className={`text-sm font-medium ${data.neutered ? 'text-teal-700' : 'text-slate-700'}`}>
                            {isFemale ? 'Castrada' : 'Castrado'}
                        </span>
                    </label>
                </div>
            </div>
        </div>
    );
}
