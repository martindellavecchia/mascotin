'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Image from 'next/image';

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
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // NextAuth siempre retorna "CredentialsSignin" - consultamos el motivo específico
        try {
          const res = await fetch('/api/auth/login-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
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
      } else {
        toast.success('¡Bienvenido a MascoTin!');
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
      {/* Left Column: Form Section */}
      <div className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-12 lg:px-20 xl:px-24 bg-slate-50 relative">
        {/* Header Logo */}
        <header className="absolute top-0 left-0 w-full p-6 sm:p-8 lg:p-10 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 text-slate-800 cursor-pointer group">
            <div className="flex items-center justify-center size-10 rounded-xl bg-teal-100 text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition-colors duration-300">
              <span className="material-symbols-rounded text-2xl">pets</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">MascoTin</h2>
          </Link>
        </header>

        <div className="w-full max-w-[440px] mx-auto mt-16 sm:mt-0">
          {/* Headings */}
          <div className="mb-8 space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 leading-[1.15]">
              Inicia sesión en tu <span className="text-teal-500">cuenta</span>
            </h1>
            <p className="text-slate-600 text-base font-medium leading-relaxed">
              Accede a tu cuenta para conectar con cuidadores y servicios para tu mascota.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
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

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="password">Contraseña</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
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

            {/* Forgot Password */}
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-3">
                <span className="material-symbols-rounded text-red-500 text-xl mt-0.5">error</span>
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                className="group relative flex w-full h-14 items-center justify-center overflow-hidden rounded-full bg-teal-500 hover:bg-teal-600 text-white font-bold text-lg tracking-wide transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transform hover:-translate-y-0.5 active:translate-y-0"
                disabled={loading}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Iniciando sesión...
                    </>
                  ) : (
                    <>
                      Iniciar sesión
                      <span className="material-symbols-rounded text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>
                    </>
                  )}
                </span>
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center space-y-4">
            <p className="text-sm font-medium text-slate-600">
              ¿No tienes una cuenta? <Link className="text-teal-600 font-bold hover:text-teal-700 underline decoration-2 decoration-transparent hover:decoration-teal-500 transition-all" href="/register">Regístrate gratis</Link>
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Al iniciar sesión, aceptas nuestros <a className="underline hover:text-slate-700" href="#">Términos de Servicio</a> y <a className="underline hover:text-slate-700" href="#">Política de Privacidad</a>.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Visual/Hero Section */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative bg-slate-900 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1544568100-847a948585b9?w=800&h=1200&fit=crop"
            alt="Un golden retriever feliz en un parque"
            fill
            className="object-cover object-center opacity-80"
            priority
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-end p-16 w-full">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl max-w-xl shadow-2xl">
            <div className="flex gap-1 mb-4 text-amber-400">
              <span className="material-symbols-rounded filled">star</span>
              <span className="material-symbols-rounded filled">star</span>
              <span className="material-symbols-rounded filled">star</span>
              <span className="material-symbols-rounded filled">star</span>
              <span className="material-symbols-rounded filled">star</span>
            </div>
            <blockquote className="text-2xl md:text-3xl font-bold text-white leading-snug mb-6">
              "Encontrar a alguien de confianza para cuidar a Max fue increíblemente fácil. ¡Recomendado!"
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full ring-2 ring-teal-400 p-0.5 bg-white">
                <Image
                  src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face"
                  alt="Retrato de un usuario"
                  width={48}
                  height={48}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div>
                <p className="text-white font-bold text-lg">María García</p>
                <p className="text-teal-300 text-sm font-medium">Dueña de Max (Golden Retriever)</p>
              </div>
            </div>
          </div>

          {/* Decorative Feature badges */}
          <div className="flex gap-4 mt-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium">
              <span className="material-symbols-rounded text-teal-400 text-lg">verified_user</span>
              Verificación de identidad
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium">
              <span className="material-symbols-rounded text-teal-400 text-lg">health_and_safety</span>
              Seguro veterinario incluido
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
