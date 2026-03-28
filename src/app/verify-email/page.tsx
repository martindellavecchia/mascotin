'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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
          <div className="flex items-center justify-center size-16 rounded-full bg-teal-100 text-teal-600 mx-auto">
            <div className="w-8 h-8 border-[3px] border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">Verificando email...</h1>
          <p className="text-slate-600">Espera un momento mientras verificamos tu correo.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="flex items-center justify-center size-16 rounded-full bg-teal-100 text-teal-600 mx-auto">
            <span className="material-symbols-rounded text-3xl">check_circle</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">Email verificado</h1>
          <p className="text-slate-600">{message}</p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-bold transition-all shadow-lg shadow-teal-500/25"
          >
            Iniciar sesión
            <span className="material-symbols-rounded">arrow_forward</span>
          </a>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="flex items-center justify-center size-16 rounded-full bg-red-100 text-red-600 mx-auto">
            <span className="material-symbols-rounded text-3xl">error</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">Error de verificación</h1>
          <p className="text-slate-600">{message}</p>
          <a
            href="/login"
            className="inline-block mt-4 text-teal-600 font-bold hover:text-teal-700 transition-colors"
          >
            Volver al inicio de sesión
          </a>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-[440px]">
        <div className="flex items-center gap-3 text-slate-800 mb-10 justify-center">
          <div className="flex items-center justify-center size-10 rounded-xl bg-teal-100 text-teal-600">
            <span className="material-symbols-rounded text-2xl">pets</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">MascoTin</h2>
        </div>

        <Suspense fallback={<div className="text-center text-slate-500">Cargando...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
