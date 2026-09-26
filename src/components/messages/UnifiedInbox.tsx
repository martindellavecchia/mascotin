'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { InboxRow } from '@/lib/server/inbox';
export default function UnifiedInbox({
  rows,
  onSelect,
}: {
  rows: InboxRow[];
  onSelect: (id: string, kind: 'match' | 'group') => void;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const filtered = rows.filter(
    (r) =>
      (kind === 'all' || kind === r.kind) &&
      `${r.title} ${r.context}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))
  );
  if (rows.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b p-4">
          <h1 className="text-lg font-bold">Mensajes</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <MessageCircle className="size-10 text-primary/40" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-foreground">Todavía no tenés conversaciones</h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Cuando haya interés mutuo con otra mascota o te sumes a un grupo, vas a poder chatear acá.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button asChild size="sm">
              <Link href="/inicio?tab=explore">Ir a Descubrir</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/community/groups">Explorar grupos</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 border-b p-4">
        <h1 className="text-lg font-bold">Mensajes</h1>
        <Input
          aria-label="Buscar conversaciones"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar conversaciones"
        />
        <select
          className="h-11 w-full rounded-md border border-border-control bg-surface px-3"
          aria-label="Tipo de conversación"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="all">Todas las conversaciones</option>
          <option value="match">Encuentros</option>
          <option value="group">Grupos</option>
          <option value="foster">Hogares de tránsito</option>
          <option value="volunteer">Voluntariado</option>
        </select>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!filtered.length && (
          <p className="p-5 text-sm text-muted-foreground">
            No hay conversaciones con estos filtros.
          </p>
        )}
        {filtered.map((row) => {
          const content = (
            <>
              <span className="flex justify-between gap-2">
                <span className="truncate font-semibold">{row.title}</span>
                {row.unread > 0 && (
                  <span
                    className="rounded-full bg-primary px-2 text-xs text-primary-foreground"
                    aria-label={`${row.unread} sin leer`}
                  >
                    {row.unread}
                  </span>
                )}
              </span>
              <span className="block text-xs text-primary">{row.context}</span>
              <span className="block truncate text-sm text-muted-foreground">{row.preview}</span>
            </>
          );
          const className =
            'block w-full min-w-0 space-y-1 border-b p-4 text-left hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary';
          return row.kind === 'match' || row.kind === 'group' ? (
            <button
              type="button"
              className={className}
              key={`${row.kind}:${row.id}`}
              onClick={() => onSelect(row.id, row.kind as 'match' | 'group')}
            >
              {content}
            </button>
          ) : (
            <Link className={className} key={`${row.kind}:${row.id}`} href={row.href}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
