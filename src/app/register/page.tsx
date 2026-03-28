'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Image from 'next/image';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const checkEmailAvailability = async (email: string) => {
    if (!email.includes('@')) return;
    setCheckingEmail(true);
    setEmailAvailable(null);

    try {
      const response = await fetch(`/api/register/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      setEmailAvailable(data.available);
    } catch (error) {
      setEmailAvailable(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 8) return 2;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)) return 4;
    return 3;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (emailAvailable === false) {
      toast.error('Este email ya está registrado');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('¡Cuenta creada exitosamente! Ahora inicia sesión.');
        router.push('/login');
      } else {
        toast.error(data.error || 'Error al crear cuenta');
      }
    } catch (error) {
      toast.error('Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthLabels = ['', 'Débil', 'Media', 'Fuerte', 'Muy fuerte'];
  const strengthColors = ['bg-slate-200', 'bg-red-500', 'bg-amber-500', 'bg-teal-500', 'bg-emerald-500'];

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
              Únete a nuestra <span className="text-teal-500">comunidad</span>
            </h1>
            <p className="text-slate-600 text-base font-medium leading-relaxed">
              Conecta con los mejores cuidadores y servicios para el bienestar integral de tu mascota.
            </p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="fullname">Nombre completo</label>
              <div className="relative">
                <Input
                  id="fullname"
                  type="text"
                  placeholder="Ej. María Pérez"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={loading}
                  className="w-full rounded-2xl bg-white border border-slate-200 h-14 px-4 text-base text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <span className="material-symbols-rounded">person</span>
                </span>
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="email">Correo electrónico</label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="hola@mascotin.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    checkEmailAvailability(e.target.value);
                  }}
                  required
                  disabled={loading}
                  className={`w-full rounded-2xl bg-white border h-14 px-4 text-base text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none ${emailAvailable === false ? 'border-red-500' : emailAvailable === true ? 'border-teal-500' : 'border-slate-200'
                    }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <span className="material-symbols-rounded">mail</span>
                </span>
              </div>
              {checkingEmail && (
                <p className="text-xs text-slate-500 mt-1 ml-1">Verificando email...</p>
              )}
              {emailAvailable === false && (
                <p className="text-xs text-red-500 mt-1 ml-1">Este email ya está registrado</p>
              )}
              {emailAvailable === true && (
                <p className="text-xs text-teal-500 mt-1 ml-1">✓ Email disponible</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="password">Contraseña</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              {/* Password strength indicator */}
              <div className="flex gap-1 pl-1 mt-2">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${level <= passwordStrength ? strengthColors[passwordStrength] : 'bg-slate-200'}`}
                  ></div>
                ))}
                <span className="text-xs text-slate-500 font-medium ml-2">{strengthLabels[passwordStrength] || ''}</span>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="confirmPassword">Confirmar contraseña</label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  disabled={loading}
                  className={`w-full rounded-2xl bg-white border h-14 px-4 pr-12 text-base text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none ${formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'border-red-500'
                      : formData.confirmPassword && formData.password === formData.confirmPassword
                        ? 'border-teal-500'
                        : 'border-slate-200'
                    }`}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <span className="material-symbols-rounded">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-500 mt-1 ml-1">Las contraseñas no coinciden</p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="text-xs text-teal-500 mt-1 ml-1">✓ Las contraseñas coinciden</p>
              )}
            </div>

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
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      Crear cuenta
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
              ¿Ya tienes una cuenta? <Link className="text-teal-600 font-bold hover:text-teal-700 underline decoration-2 decoration-transparent hover:decoration-teal-500 transition-all" href="/login">Inicia sesión</Link>
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Al registrarte, aceptas nuestros <a className="underline hover:text-slate-700" href="#">Términos de Servicio</a> y <a className="underline hover:text-slate-700" href="#">Política de Privacidad</a>.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Visual/Hero Section */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative bg-slate-900 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=1200&fit=crop"
            alt="Familia feliz con perro en jardín"
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
              "Encontrar cuidadores confiables cambió completamente mi rutina diaria con mi perro."
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full ring-2 ring-teal-400 p-0.5 bg-white">
                <Image
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
                  alt="Retrato de Carlos"
                  width={48}
                  height={48}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div>
                <p className="text-white font-bold text-lg">Carlos Rodríguez</p>
                <p className="text-teal-300 text-sm font-medium">Dueño de Bruno (Labrador)</p>
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
