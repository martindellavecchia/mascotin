'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center size-16 rounded-full bg-red-100 text-red-600 mx-auto">
          <span className="material-symbols-rounded text-3xl">error</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800">Enlace inválido</h1>
        <p className="text-slate-600">
          Este enlace no es válido o ha expirado.
        </p>
        <Link href="/forgot-password" className="inline-block mt-4 text-teal-600 font-bold hover:text-teal-700 transition-colors">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        toast.success('Contraseña actualizada correctamente');
        setTimeout(() => router.push('/login'), 3000);
      } else {
        toast.error(data.error || 'Error al restablecer contraseña');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center size-16 rounded-full bg-teal-100 text-teal-600 mx-auto">
          <span className="material-symbols-rounded text-3xl">check_circle</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800">Contraseña actualizada</h1>
        <p className="text-slate-600">
          Tu contraseña ha sido actualizada correctamente. Redirigiendo al inicio de sesión...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
          Nueva <span className="text-teal-500">contraseña</span>
        </h1>
        <p className="text-slate-600 text-base font-medium">
          Ingresa tu nueva contraseña para tu cuenta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="password">Nueva contraseña</label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded-2xl bg-white border border-slate-200 h-14 px-4 pr-12 text-base text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none"
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              <span className="material-symbols-rounded">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="confirmPassword">Confirmar contraseña</label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repite tu contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            className="w-full rounded-2xl bg-white border border-slate-200 h-14 px-4 text-base text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none"
          />
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
                Guardando...
              </>
            ) : (
              'Guardar nueva contraseña'
            )}
          </Button>
        </div>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
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
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
