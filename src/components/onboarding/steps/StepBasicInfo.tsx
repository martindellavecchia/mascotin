'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StepBasicInfoProps {
    data: any;
    updateData: (data: any) => void;
}

export default function StepBasicInfo({ data, updateData }: StepBasicInfoProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Sobre tu mascota</h2>
                <p className="text-sm text-gray-500">Cuéntanos lo básico</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                        id="name"
                        placeholder="Ej. Fido, Michi"
                        value={data.name}
                        onChange={(e) => updateData({ name: e.target.value })}
                        className="focus-visible:ring-teal-500"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Género</Label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => updateData({ gender: 'male' })}
                            className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${data.gender === 'male' ? 'border-teal-500 bg-teal-50 text-teal-700 font-bold' : 'border-gray-200 text-gray-600 hover:border-teal-200'
                                }`}
                        >
                            <span className="material-symbols-rounded">male</span> Macho
                        </button>
                        <button
                            onClick={() => updateData({ gender: 'female' })}
                            className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${data.gender === 'female' ? 'border-teal-500 bg-teal-50 text-teal-700 font-bold' : 'border-gray-200 text-gray-600 hover:border-teal-200'
                                }`}
                        >
                            <span className="material-symbols-rounded">female</span> Hembra
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="breed">Raza (Opcional)</Label>
                    <Input
                        id="breed"
                        placeholder="Ej. Golden Retriever"
                        value={data.breed}
                        onChange={(e) => updateData({ breed: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );
}
