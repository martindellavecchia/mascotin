'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
export default function UndoPassButton({
  petId,
  revision,
  onUndo,
}: {
  petId: string;
  revision: number;
  onUndo: () => void;
}) {
  const [swipeId, setSwipeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const c = new AbortController();
    setSwipeId(null);
    setError('');
    fetch(`/api/swipe?fromPetId=${petId}`, { signal: c.signal })
      .then((r) => r.json())
      .then((d) => setSwipeId(d.swipeId || null))
      .catch((e) => {
        if (e.name !== 'AbortError') setError('No pudimos consultar el último pase');
      });
    return () => c.abort();
  }, [petId, revision]);
  return (
    <div className="mt-4">
      {swipeId && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              const r = await fetch('/api/swipe', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ petId, swipeId }),
              });
              const d = await r.json();
              if (!r.ok) throw new Error(d.error);
              setSwipeId(null);
              onUndo();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'No pudimos deshacer el pase');
            } finally {
              setBusy(false);
            }
          }}
        >
          Deshacer último pase
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
