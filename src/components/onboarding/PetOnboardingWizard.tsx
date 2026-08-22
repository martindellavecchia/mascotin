'use client';

import { useState } from 'react';
import { Clock3, LoaderCircle } from 'lucide-react';
import { PetTypeIcon } from '@/components/PetTypeIcon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { initialPetSchema } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import type { Pet } from '@/types';

interface PetOnboardingWizardProps {
  onSuccess: (pet: Pet) => void;
  onCancel: () => void;
}

interface FieldErrors {
  name?: string;
  petType?: string;
  form?: string;
}

interface ApiValidationIssue {
  path?: PropertyKey[];
  message?: string;
}

interface CreatePetResponse {
  pet?: Pet;
  error?: string;
  details?: ApiValidationIssue[];
}

const PET_TYPES = [
  { id: 'dog', label: 'Perro' },
  { id: 'cat', label: 'Gato' },
  { id: 'bird', label: 'Ave' },
  { id: 'other', label: 'Otra' },
] as const;

const ENGLISH_ERROR_PATTERN = /\b(invalid|failed|missing|required|must|not authenticated|not found)\b/i;

function mapApiIssues(issues: ApiValidationIssue[] | undefined) {
  const nextErrors: FieldErrors = {};

  for (const issue of issues || []) {
    const field = issue.path?.[0];
    if ((field === 'name' || field === 'petType') && issue.message) {
      nextErrors[field] = issue.message;
    }
  }

  return nextErrors;
}

export default function PetOnboardingWizard({ onSuccess, onCancel }: PetOnboardingWizardProps) {
  const [name, setName] = useState('');
  const [petType, setPetType] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const clearError = (field: keyof FieldErrors) => {
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = initialPetSchema.safeParse({ name: name.trim(), petType });

    if (!parsed.success) {
      setErrors(mapApiIssues(parsed.error.issues));
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/pet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json() as CreatePetResponse;

      if (response.ok && data.pet) {
        onSuccess(data.pet);
        return;
      }

      const fieldErrors = mapApiIssues(data.details);
      if (fieldErrors.name || fieldErrors.petType) {
        setErrors(fieldErrors);
        return;
      }

      const apiMessage = data.error && !ENGLISH_ERROR_PATTERN.test(data.error)
        ? data.error
        : 'No pudimos crear la mascota. Intentá de nuevo.';
      setErrors({ form: apiMessage });
    } catch {
      setErrors({ form: 'No pudimos crear la mascota. Revisá tu conexión e intentá de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="my-auto w-full max-w-xl overflow-hidden">
      <CardHeader className="space-y-3 border-b border-border bg-surface px-5 py-5 text-center sm:space-y-4 sm:px-8 sm:py-8">
        <div className="mx-auto flex w-fit items-center gap-2 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary">
          <Clock3 className="size-4" aria-hidden="true" />
          Menos de un minuto
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-foreground sm:text-3xl">
            Creá el perfil básico de tu mascota
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
            Con el nombre y el tipo alcanza para empezar. La foto y el resto los podés sumar después.
          </p>
        </div>
      </CardHeader>

      <CardContent className="px-5 py-5 sm:px-8 sm:py-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-5 sm:space-y-7">
          {errors.form && (
            <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errors.form}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pet-name">Nombre</Label>
            <Input
              id="pet-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                clearError('name');
              }}
              placeholder="Por ejemplo, Mora"
              autoComplete="off"
              autoFocus
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'pet-name-error' : undefined}
              className={cn(errors.name && 'border-destructive focus-visible:ring-destructive/25')}
            />
            {errors.name && <p id="pet-name-error" className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <fieldset className="space-y-3" aria-describedby={errors.petType ? 'pet-type-error' : undefined}>
            <legend className="text-sm font-medium text-foreground">Tipo de mascota</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PET_TYPES.map((type) => {
                const selected = petType === type.id;

                return (
                  <button
                    key={type.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setPetType(type.id);
                      clearError('petType');
                    }}
                    className={cn(
                      'flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-24 sm:py-4',
                      selected
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      errors.petType && !selected && 'border-destructive/40',
                    )}
                  >
                    <PetTypeIcon petType={type.id} className="size-8" />
                    {type.label}
                  </button>
                );
              })}
            </div>
            {errors.petType && <p id="pet-type-error" className="text-sm text-destructive">{errors.petType}</p>}
          </fieldset>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-5 sm:pt-6">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
              Ahora no
            </Button>
            <Button type="submit" disabled={loading} className="min-w-44 sm:min-w-48">
              {loading ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Creando perfil...
                </>
              ) : (
                'Crear y descubrir'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
