'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        setSent(true);
        toast.success('Revisa tu correo electrónico');
      } else {
        toast.error(data.error || 'Error al procesar solicitud');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-[440px]">
        {/* Header Logo */}
        <div className="flex items-center gap-3 text-slate-800 mb-10 justify-center">
          <div className="flex items-center justify-center size-10 rounded-xl bg-teal-100 text-teal-600">
            <span className="material-symbols-rounded text-2xl">pets</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">MascoTin</h2>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center size-16 rounded-full bg-teal-100 text-teal-600 mx-auto">
              <span className="material-symbols-rounded text-3xl">mark_email_read</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800">Revisa tu correo</h1>
            <p className="text-slate-600">
              Si el email <span className="font-semibold">{email}</span> está registrado, recibirás instrucciones para restablecer tu contraseña.
            </p>
            <Link href="/login" className="inline-block mt-4 text-teal-600 font-bold hover:text-teal-700 transition-colors">
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 space-y-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
                Recuperar <span className="text-teal-500">contraseña</span>
              </h1>
              <p className="text-slate-600 text-base font-medium">
                Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="email">Correo electrónico</label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="hola@mascotin.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full rounded-2xl bg-white border border-slate-200 h-14 px-4 text-base text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <span className="material-symbols-rounded">mail</span>
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="group relative flex w-full h-14 items-center justify-center overflow-hidden rounded-full bg-teal-500 hover:bg-teal-600 text-white font-bold text-lg tracking-wide transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-rounded text-lg animate-spin mr-2">progress_activity</span>
                      Enviando...
                    </>
                  ) : (
                    'Enviar instrucciones'
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <Link href="/login" className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
                Volver al inicio de sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
