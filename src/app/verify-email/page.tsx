'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, CircleAlert, CircleCheck } from 'lucide-react';
import BrandLink from '@/components/brand/BrandLink';
import { Button } from '@/components/ui/button';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificación no proporcionado');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await res.json();

        if (data.success) {
          setStatus('success');
          setMessage('Tu email ha sido verificado correctamente');
        } else {
          setStatus('error');
          setMessage(data.error || 'Error al verificar email');
        }
      } catch {
        setStatus('error');
        setMessage('Error de conexión');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="text-center space-y-4">
      {status === 'loading' && (
        <>
          <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <div className="w-8 h-8 border-[3px] border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Verificando correo...</h1>
          <p className="text-slate-600">Esperá un momento mientras verificamos tu correo.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <CircleCheck className="size-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Correo verificado</h1>
          <p className="text-slate-600">{message}</p>
          <Button asChild className="mt-4">
            <Link href="/login">Iniciar sesión<ArrowRight className="ml-2 size-5" aria-hidden="true" /></Link>
          </Button>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <CircleAlert className="size-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Error de verificación</h1>
          <p className="text-slate-600">{message}</p>
          <Link
            href="/login"
            className="mt-4 inline-flex min-h-11 items-center text-teal-600 font-bold hover:text-teal-700 transition-colors"
          >
            Volver al inicio de sesión
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6">
      <div className="w-full max-w-[440px]">
        <BrandLink priority className="mb-10 flex w-full justify-center" logoClassName="h-12" />

        <Suspense fallback={<div className="text-center text-slate-500">Cargando...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
