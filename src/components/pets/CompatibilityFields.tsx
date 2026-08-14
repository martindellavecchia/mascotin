'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const COMPATIBILITY_LABELS: Record<string, string> = {
  yes: 'Sí',
  no: 'No',
  unknown: 'No sé',
};

export const INTENT_OPTIONS = [
  { id: 'walk', label: 'Compañero de paseo' },
  { id: 'play', label: 'Juego' },
  { id: 'social', label: 'Socializar' },
  { id: 'sit', label: 'Cuidado temporal' },
] as const;

export const TEMPERAMENT_OPTIONS = [
  { id: 'sociable', label: 'Sociable' },
  { id: 'playful', label: 'Juguetón' },
  { id: 'calm', label: 'Tranquilo' },
  { id: 'independent', label: 'Independiente' },
  { id: 'territorial', label: 'Territorial' },
  { id: 'anxious', label: 'Ansioso' },
] as const;

export const TEMPERAMENT_LABELS = Object.fromEntries(
  TEMPERAMENT_OPTIONS.map((option) => [option.id, option.label])
) as Record<string, string>;

export const INTENT_LABELS = Object.fromEntries(
  INTENT_OPTIONS.map((option) => [option.id, option.label])
) as Record<string, string>;

const COMPATIBILITY_QUESTIONS = [
  { key: 'goodWithKids', label: '¿Se lleva bien con niños?' },
  { key: 'goodWithDogs', label: '¿Se lleva bien con otros perros?' },
  { key: 'goodWithCats', label: '¿Se lleva bien con gatos?' },
  { key: 'goodWithStrangers', label: '¿Se lleva bien con extraños?' },
] as const;

interface CompatibilityFieldsProps {
  data: {
    goodWithKids?: string;
    goodWithDogs?: string;
    goodWithCats?: string;
    goodWithStrangers?: string;
    temperament?: string[];
    matchIntent?: string[];
  };
  onChange: (field: string, value: unknown) => void;
}

export default function CompatibilityFields({ data, onChange }: CompatibilityFieldsProps) {
  const toggleList = (field: 'temperament' | 'matchIntent', id: string) => {
    const current = data[field] || [];
    onChange(
      field,
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {COMPATIBILITY_QUESTIONS.map((question) => (
          <div key={question.key} className="space-y-2">
            <Label>{question.label}</Label>
            <Select
              value={data[question.key] || 'unknown'}
              onValueChange={(value) => onChange(question.key, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Elegir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="unknown">No sé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Temperamento</Label>
        <div className="flex flex-wrap gap-2">
          {TEMPERAMENT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleList('temperament', option.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                data.temperament?.includes(option.id)
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Qué busca</Label>
        <div className="grid grid-cols-2 gap-2">
          {INTENT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleList('matchIntent', option.id)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                data.matchIntent?.includes(option.id)
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
