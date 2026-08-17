'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function applicationServerKey(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export default function PushNotificationControl() {
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [deviceSubscribed, setDeviceSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    const load = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setPermission('unsupported');
        setLoading(false);
        return;
      }
      setPermission(Notification.permission);
      try {
        const [response, registration] = await Promise.all([
          fetch('/api/push'),
          navigator.serviceWorker.register('/sw.js', { scope: '/' }),
        ]);
        const data = await response.json();
        setConfigured(Boolean(data.configured));
        setPublicKey(data.publicKey || null);
        const browserSubscription = await registration?.pushManager.getSubscription();
        setDeviceSubscribed(Boolean(browserSubscription && data.subscribed));
      } catch {
        toast.error('No pudimos consultar el estado de las notificaciones push');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const activate = async () => {
    if (!publicKey || permission === 'unsupported' || permission === 'denied') return;
    setActing(true);
    try {
      const nextPermission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== 'granted') return;
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(publicKey),
      });
      const response = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo activar push');
      setDeviceSubscribed(true);
      toast.success('Notificaciones push activadas en este dispositivo');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo activar push');
    } finally {
      setActing(false);
    }
  };

  const deactivate = async () => {
    setActing(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setDeviceSubscribed(false);
      toast.success('Push desactivado en este dispositivo');
    } catch {
      toast.error('No se pudo desactivar push');
    } finally {
      setActing(false);
    }
  };

  if (loading) return <div className="h-20 animate-pulse rounded-xl bg-slate-100" />;
  if (permission === 'unsupported') {
    return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Este navegador no admite Web Push. Las alertas internas seguirán funcionando.</p>;
  }
  if (!configured) {
    return <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Web Push todavía no está habilitado en este entorno. Las alertas internas siguen activas.</p>;
  }
  if (permission === 'denied') {
    return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">El navegador bloqueó las notificaciones. No volveremos a pedir permiso; podés cambiarlo desde la configuración del sitio.</p>;
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-slate-900">Notificaciones en este dispositivo</p>
        <p className="mt-1 text-sm text-slate-500">Solo para casos, ofertas, selecciones, mensajes y cambios críticos.</p>
      </div>
      {deviceSubscribed ? (
        <Button type="button" variant="outline" disabled={acting} onClick={() => void deactivate()}>{acting ? 'Desactivando…' : 'Desactivar push'}</Button>
      ) : (
        <Button type="button" disabled={acting} onClick={() => void activate()}>{acting ? 'Activando…' : 'Activar notificaciones push'}</Button>
      )}
    </div>
  );
}
