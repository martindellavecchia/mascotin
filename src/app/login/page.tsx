'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!result || result.error || result.ok === false) {
        if (result?.error === 'Configuration') {
          setError('El servidor de autenticación no está configurado. Intenta de nuevo más tarde.');
        } else {
          try {
            const res = await fetch('/api/auth/login-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email.trim() }),
            });
            const data = await res.json();

            const messages: Record<string, string> = {
              blocked: 'Tu cuenta ha sido suspendida. Contacta a soporte para más información.',
              email_not_verified: 'Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.',
              invalid_credentials: 'El email o la contraseña son incorrectos.',
            };
            setError(messages[data.reason] || messages.invalid_credentials);
          } catch {
            setError('El email o la contraseña son incorrectos.');
          }
        }
      } else {
        toast.success('Bienvenido a MascoTin');
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('Ocurrió un error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-row">
      <div className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-12 lg:px-20 xl:px-24 bg-slate-50 relative">
        <header className="absolute top-0 left-0 w-full p-6 sm:p-8 lg:p-10">
          <Link href="/" className="flex items-center gap-2.5 text-slate-900">
            <div className="flex items-center justify-center size-10 rounded-lg bg-teal-600 text-white">
              <span className="material-symbols-rounded text-2xl filled">pets</span>
            </div>
            <span className="text-xl font-bold tracking-tight">MascoTin</span>
          </Link>
        </header>

        <div className="w-full max-w-[420px] mx-auto mt-16 sm:mt-0">
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Inicia sesión
            </h1>
            <p className="text-slate-600 text-base leading-relaxed">
              Accede para conectar a tu mascota con amigos, comunidad y servicios.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">
                Correo electrónico
              </label>
              <Input
                id="email"
                type="email"
                placeholder="hola@mascotin.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-lg bg-white border border-slate-200 h-12 px-4 text-base text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-600/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-lg bg-white border border-slate-200 h-12 px-4 pr-14 text-base text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-600/30"
                />
                <button
                  type="button"
                  className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <span className="material-symbols-rounded">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="inline-flex min-h-11 items-center text-sm font-medium text-teal-700 hover:text-teal-800"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <span className="material-symbols-rounded text-red-600 text-xl mt-0.5">error</span>
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-base"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            ¿No tienes una cuenta?{' '}
            <Link
              className="inline-flex min-h-11 items-center text-teal-700 font-semibold hover:text-teal-800"
              href="/register"
            >
              Regístrate
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative bg-slate-900 overflow-hidden">
        <Image
          src="/images/login-dog.jpg"
          alt="Perro en un parque"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12 xl:p-16 w-full">
          <p className="text-white text-4xl font-bold tracking-tight mb-2">MascoTin</p>
          <p className="text-white/85 text-lg max-w-md leading-relaxed">
            Donde las mascotas encuentran compañía y sus dueños, una comunidad.
          </p>
        </div>
      </div>
    </div>
  );
}
