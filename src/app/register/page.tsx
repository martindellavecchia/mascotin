'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import BrandLink from '@/components/brand/BrandLink';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { passwordSchema } from '@/lib/schemas';

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
      const response = await fetch(
        `/api/register/check-email?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();
      setEmailAvailable(data.available);
    } catch {
      setEmailAvailable(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 8) return 2;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password))
      return 4;
    return 3;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    const passwordCheck = passwordSchema.safeParse(formData.password);
    if (!passwordCheck.success) {
      toast.error(
        passwordCheck.error.issues[0]?.message || 'La contraseña no es válida'
      );
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
        toast.success('Cuenta creada. Ahora inicia sesión.');
        router.push('/login');
      } else {
        toast.error(data.error || 'Error al crear cuenta');
      }
    } catch {
      toast.error('Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthLabels = ['', 'Débil', 'Media', 'Fuerte', 'Muy fuerte'];
  const strengthColors = [
    'bg-slate-200',
    'bg-red-500',
    'bg-amber-500',
    'bg-teal-600',
    'bg-teal-700',
  ];

  return (
    <div className="flex min-h-screen w-full flex-row">
      <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50 px-6 py-8 sm:px-12 lg:px-20 lg:py-10 xl:px-24">
        <header className="w-full shrink-0 pb-8 lg:pb-10">
          <BrandLink priority className="w-fit" logoClassName="h-11" />
        </header>

        <div className="mx-auto w-full max-w-[420px] pb-4">
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Creá tu cuenta
            </h1>
            <p className="text-slate-600 text-base leading-relaxed">
              Regístrate para emparejar mascotas, unirte a la comunidad y descubrir servicios.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="name">
                Nombre completo
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Ej. María Pérez"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
                className="w-full rounded-lg bg-white border border-slate-200 h-12 px-4 text-base focus-visible:ring-teal-600/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">
                Correo electrónico
              </label>
              <Input
                id="email"
                type="email"
                placeholder="hola@huella.app"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  checkEmailAvailability(e.target.value);
                }}
                required
                disabled={loading}
                className={`w-full rounded-lg bg-white border h-12 px-4 text-base focus-visible:ring-teal-600/30 ${
                  emailAvailable === false
                    ? 'border-red-500'
                    : emailAvailable === true
                      ? 'border-teal-600'
                      : 'border-slate-200'
                }`}
              />
              {checkingEmail && (
                <p className="text-xs text-slate-500">Verificando email...</p>
              )}
              {emailAvailable === false && (
                <p className="text-xs text-red-600">Este email ya está registrado</p>
              )}
              {emailAvailable === true && (
                <p className="text-xs text-teal-700">Email disponible</p>
              )}
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
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  disabled={loading}
                  className="w-full rounded-lg bg-white border border-slate-200 h-12 px-4 pr-14 text-base focus-visible:ring-teal-600/30"
                />
                <button
                  type="button"
                  className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
                </button>
              </div>
              <div className="flex gap-1 items-center mt-2">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      level <= passwordStrength
                        ? strengthColors[passwordStrength]
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
                <span className="text-xs text-slate-500 ml-2">
                  {strengthLabels[passwordStrength] || ''}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Mínimo 8 caracteres, con mayúscula, minúscula y número.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="confirmPassword"
              >
                Confirmar contraseña
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                  disabled={loading}
                  className={`w-full rounded-lg bg-white border h-12 px-4 pr-14 text-base focus-visible:ring-teal-600/30 ${
                    formData.confirmPassword &&
                    formData.password !== formData.confirmPassword
                      ? 'border-red-500'
                      : formData.confirmPassword &&
                          formData.password === formData.confirmPassword
                        ? 'border-teal-600'
                        : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                >
                  {showConfirmPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
                </button>
              </div>
              {formData.confirmPassword &&
                formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-600">Las contraseñas no coinciden</p>
                )}
            </div>

            <Button
              type="submit"
              className="mt-2 h-12 w-full text-base"
              disabled={loading}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            ¿Ya tienes una cuenta?{' '}
            <Link
              className="inline-flex min-h-11 items-center text-teal-700 font-semibold hover:text-teal-800"
              href="/login"
            >
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative bg-slate-900 overflow-hidden">
        <Image
          src="/images/community-dog.jpg"
          alt="Perro y gato compartiendo al aire libre"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="relative z-10 flex flex-col justify-end p-12 xl:p-16 w-full">
          <p className="text-white text-4xl font-bold tracking-tight mb-2">Huella</p>
          <p className="text-white/85 text-lg max-w-md leading-relaxed">
            Empieza hoy: matches, comunidad y servicios pensados para tu mascota.
          </p>
        </div>
      </div>
    </div>
  );
}
