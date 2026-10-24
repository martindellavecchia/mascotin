'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StateFeedback } from '@/components/ui/state-feedback';
import type { PendingAction } from '@/lib/server/pending-actions';
export default function PendingActions({ helpOnly = false }: { helpOnly?: boolean }) {
  const [rows, setRows] = useState<PendingAction[]>([]);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/pending-actions');
      if (!r.ok) throw new Error();
      const d = await r.json();
      setRows(d.actions);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => {
      if (!document.hidden) void load();
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [load]);
  const visible = rows.filter((r) => !helpOnly || r.kind === 'help').slice(0, 5);
  if (error)
    return (
      <StateFeedback
        status="error"
        title="No pudimos cargar tus pendientes"
        action={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Reintentar
          </Button>
        }
      />
    );
  if (!visible.length) return null;
  return (
    <section aria-labelledby="pending-actions-title" className="rounded-lg border border-border bg-surface">
      <h2 id="pending-actions-title" className="px-4 pb-1 pt-4 text-base font-semibold text-foreground sm:px-5">
        Tus próximos pasos
      </h2>
      <ul className="divide-y divide-border">
        {visible.map((r) => (
          <li key={r.id}>
            <Link
              href={r.href}
              className="group flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-primary-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-foreground">{r.title}</span>
                <span className="block text-sm text-muted-foreground">{r.detail}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
