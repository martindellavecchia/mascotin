'use client';

import { useEffect, useState } from 'react';

export default function EmergencyQr({ token }: { token?: string | null }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const origin = window.location.origin;
    void import('qrcode').then(async (qrcode) => {
      const dataUrl = await qrcode.toDataURL(`${origin}/p/${token}`, { margin: 1, width: 220 });
      setSrc(dataUrl);
    });
  }, [token]);

  if (!token) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
      <p className="mb-3 text-sm font-medium text-slate-700">QR de emergencia</p>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="QR de emergencia" className="mx-auto" />
      ) : (
        <p className="text-sm text-slate-500">Generando código...</p>
      )}
      <p className="mt-2 text-xs text-slate-400">Escanealo para ver contacto de emergencia.</p>
    </div>
  );
}
