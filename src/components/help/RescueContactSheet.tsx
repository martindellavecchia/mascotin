'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import FosterChat from '@/components/help/FosterChat';
import type { RescueNeedTypeValue } from '@/components/help/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { RESCUE_NEED_LABELS } from '@/lib/rescue';
import { toast } from 'sonner';

export interface ContactReference {
  kind: 'FOSTER' | 'VOLUNTEER';
  offerId: string;
  status: string;
  expiresAt?: string;
}

export interface ContactOption {
  needId: string;
  needType: RescueNeedTypeValue;
  status: string;
  canContact: boolean;
  code: 'ELIGIBLE' | 'PROFILE_REQUIRED' | 'PROFILE_UPDATE_REQUIRED' | 'NO_CAPACITY' | 'OUT_OF_RADIUS' | 'CASE_CLOSED' | 'NOT_ELIGIBLE';
  existingContact: ContactReference | null;
}

interface RescueContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  location: string;
  speciesLabel: string;
  options: ContactOption[];
  initialNeedType?: RescueNeedTypeValue | null;
  initialContact?: ContactReference | null;
  currentUserId: string;
  isCreator: boolean;
  onChanged: () => Promise<void> | void;
}

const ELIGIBILITY_COPY: Record<ContactOption['code'], string> = {
  ELIGIBLE: 'Tu perfil es compatible con esta necesidad.',
  PROFILE_REQUIRED: 'Primero necesitás crear el perfil correspondiente.',
  PROFILE_UPDATE_REQUIRED: 'Tu perfil, disponibilidad o tipos de ayuda no coinciden con esta necesidad.',
  NO_CAPACITY: 'Tu perfil no tiene cupo disponible en este momento.',
  OUT_OF_RADIUS: 'El caso está fuera del radio configurado en tu perfil.',
  CASE_CLOSED: 'Esta necesidad ya no está recibiendo nuevas ayudas.',
  NOT_ELIGIBLE: 'No podés participar en este caso.',
};

const COMMITMENT_COPY: Record<RescueNeedTypeValue, string> = {
  FOSTER: 'Tu interés es para alojar y cuidar temporalmente al animal. Desde la entrega confirmada, el hogar asume los gastos cotidianos y las decisiones y gastos veterinarios según los términos aceptados.',
  TRANSPORT: 'Tu compromiso se limita al traslado coordinado; no incluye asumir gastos adicionales.',
  VETERINARY: 'Tu compromiso se limita al acompañamiento coordinado; no incluye gastos ni decisiones veterinarias.',
  SUPPLIES: 'Tu compromiso se limita a coordinar la logística de los insumos acordados; no implica comprarlos.',
  FIELD_SUPPORT: 'Tu compromiso se limita al apoyo de campo coordinado y no reemplaza asistencia profesional.',
};

export default function RescueContactSheet({
  open,
  onOpenChange,
  caseId,
  location,
  speciesLabel,
  options,
  initialNeedType,
  initialContact,
  currentUserId,
  isCreator,
  onChanged,
}: RescueContactSheetProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const firstType = initialNeedType && options.some((option) => option.needType === initialNeedType)
    ? initialNeedType
    : options[0]?.needType;
  const [selectedNeedType, setSelectedNeedType] = useState<RescueNeedTypeValue | undefined>(firstType);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeContact, setActiveContact] = useState<ContactReference | null>(initialContact || null);
  const activeContactKind = activeContact?.kind;
  const activeContactOfferId = activeContact?.offerId;
  const handleConversationChange = useCallback((conversation: { status: string }) => {
    setActiveContact((current) => current && current.status !== conversation.status
      ? { ...current, status: conversation.status }
      : current);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (initialContact) {
      setActiveContact(initialContact);
      return;
    }
    const preferred = options.find((option) => option.needType === initialNeedType) || options[0];
    setSelectedNeedType(preferred?.needType);
    setActiveContact(preferred?.existingContact || null);
  }, [initialContact, initialNeedType, open, options]);

  useEffect(() => {
    if (!open || !activeContactKind || !activeContactOfferId) return;
    const kind = activeContactKind === 'FOSTER' ? 'foster' : 'volunteer';
    router.replace(`/hogares-de-transito/casos/${caseId}?contact=1&kind=${kind}&offer=${activeContactOfferId}`, { scroll: false });
  }, [activeContactKind, activeContactOfferId, caseId, open, router]);

  const selectedOption = useMemo(
    () => options.find((option) => option.needType === selectedNeedType),
    [options, selectedNeedType],
  );
  const returnTo = `/hogares-de-transito/casos/${caseId}?contact=1${selectedNeedType ? `&need=${selectedNeedType}` : ''}`;
  const profileHref = selectedNeedType === 'FOSTER'
    ? `/hogares-de-transito?create=profile&returnTo=${encodeURIComponent(returnTo)}`
    : `/hogares-de-transito?view=volunteer&create=volunteer&returnTo=${encodeURIComponent(returnTo)}`;

  const openContact = async () => {
    if (!selectedOption?.canContact) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/rescue-cases/${caseId}/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          needType: selectedOption.needType,
          ...(message.trim() ? { message: message.trim() } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo abrir el contacto');
      setActiveContact({ kind: data.kind, offerId: data.offerId, status: data.status, expiresAt: data.expiresAt });
      setMessage('');
      toast.success('Interés confirmado. Ya pueden conversar.');
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo abrir el contacto');
    } finally {
      setSubmitting(false);
    }
  };

  const closeContact = async () => {
    if (!activeContact) return;
    setSubmitting(true);
    const namespace = activeContact.kind === 'FOSTER' ? 'foster' : 'volunteer';
    const action = isCreator ? 'close' : 'withdraw';
    try {
      const response = await fetch(`/api/${namespace}/offers/${activeContact.offerId}/${action}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo cerrar el contacto');
      toast.success(isCreator ? 'Contacto cerrado' : 'Retiraste tu interés');
      setActiveContact(null);
      onOpenChange(false);
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar el contacto');
    } finally {
      setSubmitting(false);
    }
  };

  const selectContact = async () => {
    if (!activeContact || !isCreator) return;
    setSubmitting(true);
    const namespace = activeContact.kind === 'FOSTER' ? 'foster' : 'volunteer';
    try {
      const response = await fetch(`/api/${namespace}/offers/${activeContact.offerId}/select`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo seleccionar la ayuda');
      setActiveContact((current) => current ? { ...current, status: 'SELECTED' } : current);
      toast.success(activeContact.kind === 'FOSTER' ? 'Hogar seleccionado. Ya pueden coordinar.' : 'Persona responsable seleccionada.');
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo seleccionar la ayuda');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={isMobile
          ? 'max-h-[92svh] overflow-y-auto rounded-t-2xl bg-white'
          : 'w-full overflow-y-auto bg-white sm:max-w-xl'}
      >
        <SheetHeader className="border-b border-slate-100 pr-14">
          <SheetTitle>{activeContact ? 'Conversación privada' : 'Quiero ayudar'}</SheetTitle>
          <SheetDescription>
            {speciesLabel} · {location}. La dirección exacta y los datos personales permanecen privados.
          </SheetDescription>
        </SheetHeader>

        {activeContact ? (
          <div className="space-y-4 px-4 pb-6">
            <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-900">
              {activeContact.status === 'SELECTED'
                ? 'Esta ayuda ya fue seleccionada y el mismo historial continúa durante la coordinación.'
                : 'Confirmar interés no te asigna el caso. La persona responsable debe seleccionar la ayuda antes de coordinar la tarea o la entrega.'}
            </div>
            <FosterChat
              fosterOfferId={activeContact.kind === 'FOSTER' ? activeContact.offerId : undefined}
              volunteerOfferId={activeContact.kind === 'VOLUNTEER' ? activeContact.offerId : undefined}
              currentUserId={currentUserId}
              enabled={['INTERESTED', 'SELECTED'].includes(activeContact.status)}
              context={activeContact.kind === 'FOSTER' ? 'foster' : 'volunteer'}
              onConversationChange={handleConversationChange}
            />
            {activeContact.status === 'INTERESTED' && (
              <div className="grid gap-2 sm:grid-cols-2">
                {isCreator && (
                  <Button disabled={submitting} onClick={() => void selectContact()}>
                    {activeContact.kind === 'FOSTER' ? 'Elegir este hogar' : 'Elegir responsable'}
                  </Button>
                )}
                <Button variant="outline" className={isCreator ? undefined : 'w-full'} disabled={submitting} onClick={() => void closeContact()}>
                  {isCreator ? 'No continuar con esta ayuda' : 'Retirar mi interés'}
                </Button>
              </div>
            )}
          </div>
        ) : options.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-600">No hay necesidades abiertas para contactar.</div>
        ) : (
          <div className="space-y-5 px-4 pb-6">
            {options.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="contact-need">¿Cómo querés ayudar?</Label>
                <Select value={selectedNeedType} onValueChange={(value) => {
                  const next = value as RescueNeedTypeValue;
                  setSelectedNeedType(next);
                  setActiveContact(options.find((option) => option.needType === next)?.existingContact || null);
                }}>
                  <SelectTrigger id="contact-need"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {options.map((option) => <SelectItem key={option.needId} value={option.needType}>{RESCUE_NEED_LABELS[option.needType]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedOption && (
              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{RESCUE_NEED_LABELS[selectedOption.needType]}</p>
                  <Badge variant="outline">Interés previo</Badge>
                </div>
                <p className="text-sm text-slate-600">{ELIGIBILITY_COPY[selectedOption.code]}</p>
                <p className="text-sm text-slate-600">{COMMITMENT_COPY[selectedOption.needType]}</p>
                <p className="text-xs font-medium text-slate-500">Confirmar interés todavía no te asigna el caso.</p>
              </div>
            )}

            {selectedOption?.canContact ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="contact-message">Nota inicial opcional</Label>
                  <Textarea
                    id="contact-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Ej. Puedo ayudar mañana por la tarde."
                  />
                </div>
                <Button className="w-full" disabled={submitting} onClick={() => void openContact()}>
                  {submitting ? 'Confirmando…' : 'Confirmar interés y abrir chat'}
                </Button>
              </>
            ) : selectedOption && !['CASE_CLOSED', 'NOT_ELIGIBLE'].includes(selectedOption.code) ? (
              <Button asChild className="w-full"><Link href={profileHref}>Crear o actualizar mi perfil</Link></Button>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
