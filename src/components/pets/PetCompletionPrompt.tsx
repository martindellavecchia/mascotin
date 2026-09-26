'use client';

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMissingFields } from '@/lib/pet-display';
import { cn } from '@/lib/utils';

interface PetCompletionPromptProps {
  petName: string;
  missingFields: string[];
  href?: string;
  onComplete?: () => void;
  className?: string;
}

export function PetCompletionPrompt({ petName, missingFields, href, onComplete, className }: PetCompletionPromptProps) {
  if (missingFields.length === 0) return null;

  const label = `Completá el perfil de ${petName}`;

  return (
    <section
      aria-label={label}
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <ClipboardList className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold text-amber-900">{label}</p>
          <p className="text-sm text-amber-800">
            Falta: {formatMissingFields(missingFields)}. Con un perfil completo aparece mejor en Explorar.
          </p>
        </div>
      </div>
      {href ? (
        <Button asChild size="sm" className="shrink-0">
          <Link href={href}>Completar perfil</Link>
        </Button>
      ) : onComplete ? (
        <Button type="button" size="sm" className="shrink-0" onClick={onComplete}>
          Completar perfil
        </Button>
      ) : null}
    </section>
  );
}
