'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { shouldUnoptimizeImage } from '@/lib/media';
import { toast } from 'sonner';

interface Publication {
  summary: string;
  publicZone: string | null;
  isVisible: boolean;
}

export default function RescueCasePublicationCard({
  caseId,
  description,
  images,
  publication,
  onChanged,
}: {
  caseId: string;
  description: string;
  images: string[];
  publication: Publication | null;
  onChanged: () => Promise<void>;
}) {
  const [summary, setSummary] = useState(publication?.summary || description);
  const [publicZone, setPublicZone] = useState(publication?.publicZone || '');
  const [imageIndex, setImageIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const publish = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/rescue-cases/${caseId}/publication`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, publicZone, imageIndex }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo publicar');
      toast.success(publication ? 'Publicación actualizada' : 'Caso publicado en Comunidad');
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo publicar');
    } finally {
      setSaving(false);
    }
  };

  const unpublish = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/rescue-cases/${caseId}/publication`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo retirar');
      toast.success('La publicación fue retirada de Comunidad');
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo retirar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Difundir en Comunidad</CardTitle>
          {publication?.isVisible && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Publicado</span>}
        </div>
        <p className="text-sm text-slate-500">Confirmá el texto y una zona general. La ubicación exacta nunca se comparte.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="foster-public-summary">Resumen público</Label>
          <Textarea id="foster-public-summary" value={summary} onChange={(event) => setSummary(event.target.value)} rows={5} maxLength={1000} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="foster-public-zone">Zona general</Label>
          <Input id="foster-public-zone" value={publicZone} onChange={(event) => setPublicZone(event.target.value)} placeholder="Ej. Palermo, CABA" maxLength={120} />
        </div>
        {images.length > 1 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-800">Foto pública</legend>
            <div className="flex gap-2">
              {images.map((image, index) => (
                <button key={image} type="button" onClick={() => setImageIndex(index)} className={`relative size-20 overflow-hidden rounded-xl border-2 ${imageIndex === index ? 'border-teal-600' : 'border-transparent'}`} aria-label={`Usar foto ${index + 1}`} aria-pressed={imageIndex === index}>
                  <Image src={image} alt="" fill sizes="80px" unoptimized={shouldUnoptimizeImage(image)} className="object-cover" />
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <div className="overflow-hidden rounded-xl border border-orange-200 bg-orange-50/60">
          {images[imageIndex] && <div className="relative h-36"><Image src={images[imageIndex]} alt="Vista previa pública" fill sizes="420px" unoptimized={shouldUnoptimizeImage(images[imageIndex])} className="object-cover" /></div>}
          <div className="space-y-1 p-3"><p className="text-xs font-bold text-orange-800">HOGAR DE TRÁNSITO</p><p className="text-sm text-slate-700">{summary || 'Tu resumen aparecerá acá.'}</p><p className="text-xs text-slate-500">{publicZone || 'Zona general pendiente'}</p></div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button disabled={saving} onClick={() => void publish()}>{saving ? 'Guardando…' : publication?.isVisible ? 'Actualizar publicación' : 'Publicar en Comunidad'}</Button>
          {publication?.isVisible && <Button variant="outline" disabled={saving} onClick={() => void unpublish()}>Retirar del muro</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
