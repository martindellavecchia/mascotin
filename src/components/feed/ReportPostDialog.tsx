'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { CreateReportData } from '@/lib/schemas';

type ReportReason = CreateReportData['reason'];

const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
    { value: 'spam', label: 'Spam o publicidad engañosa' },
    { value: 'inappropriate', label: 'Contenido inapropiado' },
    { value: 'harassment', label: 'Acoso u ofensas' },
    { value: 'other', label: 'Otro motivo' },
];

interface ReportPostDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reportedId: string;
    targetId: string;
    targetType: 'POST' | 'ALERT';
}

export default function ReportPostDialog({ open, onOpenChange, reportedId, targetId, targetType }: ReportPostDialogProps) {
    const [reason, setReason] = useState<ReportReason | ''>('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleOpenChange = (next: boolean) => {
        if (submitting) return;
        if (!next) {
            setReason('');
            setDescription('');
        }
        onOpenChange(next);
    };

    const handleSubmit = async () => {
        if (!reason) return;
        setSubmitting(true);
        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportedId,
                    targetType,
                    targetId,
                    reason,
                    description: description.trim() || undefined,
                }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok || !data?.success) {
                toast.error(data?.error || 'No se pudo enviar el reporte');
                return;
            }
            toast.success('Gracias, recibimos tu reporte');
            setReason('');
            setDescription('');
            onOpenChange(false);
        } catch {
            toast.error('Error de conexión. Intentá de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reportar publicación</DialogTitle>
                    <DialogDescription>
                        Contanos qué pasa. El equipo de moderación revisa cada reporte.
                    </DialogDescription>
                </DialogHeader>
                <RadioGroup
                    value={reason}
                    onValueChange={(value) => setReason(value as ReportReason)}
                    aria-label="Motivo del reporte"
                >
                    {REPORT_REASONS.map((option) => (
                        <div key={option.value} className="flex items-center gap-3">
                            <RadioGroupItem value={option.value} id={`report-${targetId}-${option.value}`} />
                            <Label htmlFor={`report-${targetId}-${option.value}`} className="font-normal">
                                {option.label}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
                <div className="space-y-2">
                    <Label htmlFor={`report-${targetId}-description`}>Detalles (opcional)</Label>
                    <Textarea
                        id={`report-${targetId}-description`}
                        value={description}
                        maxLength={1000}
                        onChange={(event) => setDescription(event.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
                        Volver
                    </Button>
                    <Button variant="destructive" onClick={() => void handleSubmit()} disabled={!reason || submitting}>
                        {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                        Enviar reporte
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
