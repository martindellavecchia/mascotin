'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EmergencyQr({ token }: { token?: string | null }) {
  const [src, setSrc] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState('');

  useEffect(() => {
    if (!token) return;
    const origin = window.location.origin;
    const url = `${origin}/p/${token}`;
    setPublicUrl(url);
    void import('qrcode').then(async (qrcode) => {
      const dataUrl = await qrcode.toDataURL(url, { margin: 1, width: 220 });
      setSrc(dataUrl);
    });
  }, [token]);

  if (!token) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'QR de emergencia Huella',
          text: 'Abrí este enlace si encontrás a mi mascota.',
          url: publicUrl,
        });
        return;
      } catch {
        // cancelled
      }
    }
    await copyLink();
  };

  return (
    <Card>
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-base">QR de emergencia</CardTitle>
        <p className="text-xs font-normal text-slate-500">
          Quien lo escanee ve solo el contacto de emergencia que habilitaste.
        </p>
      </CardHeader>
      <CardContent className="text-center">
        {src ? (
          <img src={src} alt="QR de emergencia" className="mx-auto rounded-lg border border-slate-100" />
        ) : (
          <p className="text-sm text-slate-500">Generando código...</p>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {src ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={src} download="huella-qr.png">
                Descargar PNG
              </a>
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" disabled>
              Descargar PNG
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
            Copiar enlace
          </Button>
          <Button type="button" size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => void shareLink()}>
            Compartir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
