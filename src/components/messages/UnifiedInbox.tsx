'use client';
import { useState } from 'react';
import Link from 'next/link';
import { HandHeart, HeartHandshake, MessageCircle, PawPrint, Search, Users, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, timeAgo } from '@/lib/utils';
import type { InboxRow } from '@/lib/server/inbox';

const KIND_ICONS: Record<InboxRow['kind'], LucideIcon> = {
  match: PawPrint,
  group: Users,
  foster: HeartHandshake,
  volunteer: HandHeart,
};

export default function UnifiedInbox({
  rows,
  onSelect,
  selectedId,
}: {
  rows: InboxRow[];
  onSelect: (id: string, kind: 'match' | 'group') => void;
  selectedId?: string | null;
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
        <div className="border-b border-border p-4">
          <h1 className="text-lg font-bold text-foreground">Mensajes</h1>
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
      <div className="space-y-3 border-b border-border p-4">
        <h1 className="text-lg font-bold text-foreground">Mensajes</h1>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Buscar conversaciones"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conversaciones"
            className="pl-9"
          />
        </div>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger aria-label="Tipo de conversación">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las conversaciones</SelectItem>
            <SelectItem value="match">Encuentros</SelectItem>
            <SelectItem value="group">Grupos</SelectItem>
            <SelectItem value="foster">Hogares de tránsito</SelectItem>
            <SelectItem value="volunteer">Voluntariado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!filtered.length && (
          <p className="p-5 text-sm text-muted-foreground">
            No hay conversaciones con estos filtros.
          </p>
        )}
        {filtered.map((row) => {
          const Icon = KIND_ICONS[row.kind] ?? MessageCircle;
          const unread = row.unread > 0;
          const selected = selectedId === row.id;
          const content = (
            <>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn('truncate text-foreground', unread ? 'font-bold' : 'font-semibold')}>{row.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground" suppressHydrationWarning>{timeAgo(row.updatedAt)}</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">{row.context}</span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className={cn('truncate text-sm', unread ? 'font-medium text-foreground' : 'text-muted-foreground')}>{row.preview}</span>
                  {unread && (
                    <span
                      className="min-w-5 shrink-0 rounded-full bg-primary px-1.5 text-center text-xs font-semibold leading-5 text-primary-foreground"
                      aria-label={`${row.unread} sin leer`}
                    >
                      {row.unread}
                    </span>
                  )}
                </span>
              </span>
            </>
          );
          const className = cn(
            'flex w-full min-w-0 items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
            selected ? 'bg-primary-soft' : 'hover:bg-primary-soft/50',
          );
          return row.kind === 'match' || row.kind === 'group' ? (
            <button
              type="button"
              className={className}
              key={`${row.kind}:${row.id}`}
              onClick={() => onSelect(row.id, row.kind as 'match' | 'group')}
              aria-current={selected ? 'true' : undefined}
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
