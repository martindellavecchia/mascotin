'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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
      <div className="mb-5 rounded-xl border p-4">
        <p>No pudimos cargar tus pendientes.</p>
        <Button variant="outline" onClick={() => void load()}>
          Reintentar
        </Button>
      </div>
    );
  if (!visible.length) return null;
  return (
    <section className="mb-6 rounded-xl border bg-surface p-5">
      <h2 className="mb-3 text-xl font-bold">Tus próximos pasos</h2>
      <div className="divide-y">
        {visible.map((r) => (
          <Link key={r.id} href={r.href} className="block space-y-1 py-3 hover:text-primary">
            <span className="block font-semibold">{r.title}</span>
            <span className="block text-sm text-muted-foreground">{r.detail}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
