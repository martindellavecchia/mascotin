'use client';

import CompatibilityFields from '@/components/pets/CompatibilityFields';

interface StepCompatibilityProps {
  data: {
    goodWithKids?: string;
    goodWithDogs?: string;
    goodWithCats?: string;
    goodWithStrangers?: string;
    temperament?: string[];
    matchIntent?: string[];
    [key: string]: unknown;
  };
  updateData: (data: Record<string, unknown>) => void;
}

export default function StepCompatibility({ data, updateData }: StepCompatibilityProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Compatibilidad</h2>
        <p className="text-sm text-slate-500">Esto ayuda a encontrar amigos y hogares responsables.</p>
      </div>
      <CompatibilityFields
        data={data}
        onChange={(field, value) => updateData({ [field]: value })}
      />
    </div>
  );
}
