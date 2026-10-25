'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReturnLink from '@/components/auth/ReturnLink';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import BrandLink from '@/components/brand/BrandLink';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { passwordSchema } from '@/lib/schemas';
import { sanitizeCallbackUrl } from '@/lib/callback-url';

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
      document.getElementById('confirmPassword')?.focus();
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
      document.getElementById('email')?.focus();
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
        toast.success('Cuenta creada. Ahora iniciá sesión.');
        const callbackUrl = sanitizeCallbackUrl(new URLSearchParams(window.location.search).get('callbackUrl'));
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
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
    'bg-muted',
    'bg-red-500',
    'bg-amber-500',
    'bg-primary',
    'bg-primary-hover',
  ];

  return (
    <div className="flex min-h-screen w-full flex-row">
      <div className="flex flex-1 flex-col overflow-y-auto bg-background px-6 py-8 sm:px-12 lg:px-20 lg:py-10 xl:px-24">
        <header className="w-full shrink-0 pb-8 lg:pb-10">
          <BrandLink priority className="w-fit" logoClassName="h-11" />
        </header>

        <div className="mx-auto w-full max-w-[420px] pb-4">
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
              Creá tu cuenta
            </h1>
            <p className="text-slate-600 text-base leading-relaxed">
              Registrate para encontrar compañía para tu mascota, sumarte a la comunidad y descubrir servicios.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="name">
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
                className="w-full rounded-lg bg-surface border border-border-control h-12 px-4 text-base focus-visible:ring-ring/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                Correo electrónico
              </label>
              <Input
                id="email"
                type="email"
                aria-invalid={emailAvailable === false}
                aria-describedby={emailAvailable === false ? 'email-status' : undefined}
                placeholder="hola@huella.app"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  checkEmailAvailability(e.target.value);
                }}
                required
                disabled={loading}
                className={`w-full rounded-lg bg-surface border h-12 px-4 text-base focus-visible:ring-ring/30 ${
                  emailAvailable === false
                    ? 'border-red-500'
                    : emailAvailable === true
                      ? 'border-primary'
                      : 'border-border-control'
                }`}
              />
              {checkingEmail && (
                <p className="text-xs text-muted-foreground">Verificando email...</p>
              )}
              {emailAvailable === false && (
                <p id="email-status" className="text-xs text-destructive">Este email ya está registrado</p>
              )}
              {emailAvailable === true && (
                <p className="text-xs text-primary">Email disponible</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  disabled={loading}
                  className="w-full rounded-lg bg-surface border border-border-control h-12 px-4 pr-14 text-base focus-visible:ring-ring/30"
                />
                <button
                  type="button"
                  className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
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
                        : 'bg-muted'
                    }`}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-2">
                  {strengthLabels[passwordStrength] || ''}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres, con mayúscula, minúscula y número.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="confirmPassword"
              >
                Confirmar contraseña
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  aria-invalid={Boolean(formData.confirmPassword) && formData.password !== formData.confirmPassword}
                  aria-describedby={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'confirm-password-error' : undefined}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                  disabled={loading}
                  className={`w-full rounded-lg bg-surface border h-12 px-4 pr-14 text-base focus-visible:ring-ring/30 ${
                    formData.confirmPassword &&
                    formData.password !== formData.confirmPassword
                      ? 'border-red-500'
                      : formData.confirmPassword &&
                          formData.password === formData.confirmPassword
                        ? 'border-primary'
                        : 'border-border-control'
                  }`}
                />
                <button
                  type="button"
                  className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
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
                  <p id="confirm-password-error" className="text-xs text-destructive">Las contraseñas no coinciden</p>
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
            ¿Ya tenés una cuenta?{' '}
            <ReturnLink
              className="inline-flex min-h-11 items-center text-primary font-semibold hover:text-primary"
              href="/login"
            >
              Iniciá sesión
            </ReturnLink>
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
            Empezá hoy: encuentros, comunidad y servicios pensados para tu mascota.
          </p>
        </div>
      </div>
    </div>
  );
}
