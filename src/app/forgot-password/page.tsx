'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LoaderCircle, Mail, MailCheck } from 'lucide-react';
import BrandLink from '@/components/brand/BrandLink';
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
        toast.success('Revisá tu correo electrónico');
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
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6">
      <div className="w-full max-w-[440px]">
        <BrandLink priority className="mb-10 flex w-full justify-center" logoClassName="h-12" />

        {sent ? (
          <div className="text-center space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <MailCheck className="size-8" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Revisá tu correo</h1>
            <p className="text-slate-600">
              Si el correo <span className="font-semibold">{email}</span> está registrado, vas a recibir instrucciones para restablecer tu contraseña.
            </p>
            <Link href="/login" className="mt-4 inline-flex min-h-11 items-center text-teal-600 font-bold hover:text-teal-700 transition-colors">
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
                Ingresá tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="email">Correo electrónico</label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="hola@huella.app"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 w-full pr-11 text-base"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="size-5" aria-hidden="true" />
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar instrucciones'
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <Link href="/login" className="inline-flex min-h-11 items-center text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
                Volver al inicio de sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
