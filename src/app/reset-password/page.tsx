'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CircleAlert, CircleCheck, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import BrandLink from '@/components/brand/BrandLink';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { passwordSchema } from '@/lib/schemas';
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
        <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-red-100 text-red-600">
          <CircleAlert className="size-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Enlace inválido</h1>
        <p className="text-slate-600">
          Este enlace no es válido o ya venció.
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

    const passwordCheck = passwordSchema.safeParse(password);
    if (!passwordCheck.success) {
      toast.error(passwordCheck.error.issues[0]?.message || 'La contraseña no es válida');
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
        <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <CircleCheck className="size-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Contraseña actualizada</h1>
        <p className="text-slate-600">
          Tu contraseña se actualizó correctamente. Te estamos llevando al inicio de sesión.
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
          Ingresá una nueva contraseña para tu cuenta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="password">Nueva contraseña</label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="h-12 w-full pr-14 text-base"
            />
            <button
              type="button"
              className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
            </button>
          </div>
          <p className="ml-1 text-xs leading-relaxed text-slate-500">
            Usá al menos 8 caracteres, una mayúscula, una minúscula y un número.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="confirmPassword">Confirmar contraseña</label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repetí tu contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            className="h-12 w-full text-base"
          />
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
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6">
      <div className="w-full max-w-[440px]">
        <BrandLink priority className="mb-10 flex w-full justify-center" logoClassName="h-12" />

        <Suspense fallback={<div className="text-center text-slate-500">Cargando...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
