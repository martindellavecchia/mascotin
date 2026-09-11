'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  INTENT_OPTIONS,
  PRODUCT_INTENTS,
  isProductIntent,
  type ProductIntent,
} from '@/lib/product-intent';

export default function IntentEntry({ navigate = true }: { navigate?: boolean }) {
  const router = useRouter();
  const [intent, setIntent] = useState<ProductIntent | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choiceStarted = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/settings', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('No pudimos cargar tu preferencia.');
        const data = await response.json();
        if (!choiceStarted.current && isProductIntent(data.settings?.entryIntent))
          setIntent(data.settings.entryIntent);
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError')
          setError('No pudimos cargar tu preferencia. Podés elegirla de nuevo.');
      });
    return () => controller.abort();
  }, []);
  async function choose(next: ProductIntent) {
    choiceStarted.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIntent: next }),
      });
      if (!response.ok) throw new Error('No pudimos guardar tu elección. Intentá nuevamente.');
      setIntent(next);
      setEditing(false);
      if (navigate) router.push(INTENT_OPTIONS[next].href);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No pudimos guardar tu elección.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Tu intención en Huella"
      className="mb-6 space-y-4 rounded-xl border border-border bg-surface p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">
          {intent ? 'Tu camino en Huella' : '¿Qué te gustaría hacer?'}
        </h2>
        {intent && (
          <Button variant="ghost" onClick={() => setEditing(!editing)} disabled={busy}>
            {editing ? 'Cerrar opciones' : 'Cambiar intención'}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {(intent && !editing ? [intent] : [...PRODUCT_INTENTS]).map((value) => (
          <Button
            key={value}
            variant="outline"
            disabled={busy}
            onClick={() => void choose(value)}
            className="h-auto min-h-24 flex-col items-start whitespace-normal px-4 py-3 text-left"
          >
            <span className="font-semibold">{INTENT_OPTIONS[value].title}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {INTENT_OPTIONS[value].description}
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
}
