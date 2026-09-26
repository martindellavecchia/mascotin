'use client';

import { useState } from 'react';
import { CalendarClock, Check, Loader2, Plus, RotateCcw, Syringe, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface HealthRecord {
  id: string;
  type: string;
  name: string;
  dueDate: string | null;
  completedAt: string | null;
}

interface HealthRecordsCardProps {
  petId: string;
  records: HealthRecord[];
  onChange: (records: HealthRecord[]) => void;
}

export const HEALTH_RECORD_TYPE_LABELS: Record<string, string> = {
  VACCINE: 'Vacuna',
  CHECKUP: 'Control veterinario',
  MEDICATION: 'Medicación o desparasitación',
};

function formatDueDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
}

function todayKey() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).getTime();
}

export function sortHealthRecords(records: HealthRecord[]) {
  return [...records].sort((a, b) => {
    if (Boolean(a.completedAt) !== Boolean(b.completedAt)) return a.completedAt ? 1 : -1;
    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  });
}

export default function HealthRecordsCard({ petId, records, onChange }: HealthRecordsCardProps) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState('VACCINE');
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const today = todayKey();

  const resetForm = () => {
    setAdding(false);
    setType('VACCINE');
    setName('');
    setDueDate('');
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error('Escribí un nombre para el registro');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/pet/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId, type, name: name.trim(), dueDate: dueDate || null }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error || 'No pudimos guardar el registro');
        return;
      }
      onChange(sortHealthRecords([...records, data.healthRecord]));
      toast.success('Registro agregado');
      resetForm();
    } catch (error) {
      console.error('Error creating health record:', error);
      toast.error('No pudimos guardar el registro. Revisá tu conexión.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCompleted = async (record: HealthRecord) => {
    setBusyId(record.id);
    try {
      const response = await fetch('/api/pet/health', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: record.id, completedAt: record.completedAt ? null : new Date().toISOString() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error || 'No pudimos actualizar el registro');
        return;
      }
      onChange(sortHealthRecords(records.map((item) => (item.id === record.id ? data.healthRecord : item))));
    } catch (error) {
      console.error('Error updating health record:', error);
      toast.error('No pudimos actualizar el registro. Revisá tu conexión.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (record: HealthRecord) => {
    try {
      const response = await fetch(`/api/pet/health?recordId=${encodeURIComponent(record.id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error || 'No pudimos eliminar el registro');
        return false;
      }
      onChange(records.filter((item) => item.id !== record.id));
      toast.success('Registro eliminado');
      return true;
    } catch (error) {
      console.error('Error deleting health record:', error);
      toast.error('No pudimos eliminar el registro. Revisá tu conexión.');
      return false;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">Vacunas y recordatorios</h3>
        {!adding && (
          <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Agregar
          </Button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-border bg-background p-3">
          <div className="space-y-1.5">
            <Label htmlFor="health-type">Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="health-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(HEALTH_RECORD_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="health-name">Nombre</Label>
            <Input
              id="health-name"
              value={name}
              maxLength={80}
              placeholder="Ej.: Antirrábica, Séxtuple, Pipeta"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="health-due">Próxima fecha (opcional)</Label>
            <Input id="health-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Guardar
            </Button>
          </div>
        </form>
      )}

      {records.length === 0 && !adding ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-slate-500">
          Anotá vacunas, desparasitaciones y controles para tener las fechas a mano.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {records.map((record) => {
            const done = Boolean(record.completedAt);
            const overdue = !done && record.dueDate && new Date(record.dueDate).getTime() < today;
            return (
              <li key={record.id} className="flex items-center gap-3 px-3 py-2.5">
                <Syringe className={cn('size-4 shrink-0', done ? 'text-slate-300' : 'text-primary')} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate font-medium', done && 'text-slate-400 line-through')}>{record.name}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span>{HEALTH_RECORD_TYPE_LABELS[record.type] ?? record.type}</span>
                    {record.dueDate && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3" aria-hidden="true" />
                        {formatDueDate(record.dueDate)}
                      </span>
                    )}
                    {overdue && <Badge variant="warning" className="px-1.5 py-0 text-[11px]">Vencido</Badge>}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-9"
                  disabled={busyId === record.id}
                  onClick={() => void toggleCompleted(record)}
                  aria-label={done ? `Marcar ${record.name} como pendiente` : `Marcar ${record.name} como hecho`}
                >
                  {busyId === record.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : done ? (
                    <RotateCcw className="size-4" aria-hidden="true" />
                  ) : (
                    <Check className="size-4" aria-hidden="true" />
                  )}
                </Button>
                <ConfirmDialog
                  title={`¿Eliminar "${record.name}"?`}
                  description="El registro se borrará del carnet de salud."
                  confirmLabel="Eliminar"
                  destructive
                  onConfirm={() => handleDelete(record)}
                  trigger={(
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-9 text-slate-500 hover:text-destructive"
                      aria-label={`Eliminar ${record.name}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
