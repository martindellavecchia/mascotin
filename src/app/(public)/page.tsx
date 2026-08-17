import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-static';

export default function GuestHomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="relative min-h-[100svh] flex flex-col">
        <Image
          src="/images/hero-dogs.webp"
          alt="Dos perros jugando al aire libre"
          fill
          sizes="100vw"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/30" />

        <div className="relative z-10 flex-1 flex flex-col justify-end px-6 sm:px-10 pb-16 sm:pb-20 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-4 animate-fade-in">
            Compañía real para tu mascota
          </h1>
          <p className="text-lg sm:text-xl text-white/85 max-w-xl mb-8 leading-relaxed">
            Empareja, comparte en comunidad y encuentra servicios — todo en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              className="h-12 px-8 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-base"
            >
              <Link href="/register">Crear cuenta</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 px-8 rounded-lg border-white/40 bg-white/5 text-white hover:bg-white/15 hover:text-white font-semibold text-base"
            >
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="relative bg-slate-50 text-slate-900">
        <div className="container mx-auto px-6 sm:px-10 py-16 sm:py-20 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Un espacio pensado para dueños y mascotas
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              Descubre perfiles cercanos, conversa tras un match y participa en una
              comunidad que entiende el día a día con animales.
            </p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
            <Image
              src="/images/community-dog.webp"
              alt="Persona con su perro en casa"
              fill
              sizes="(min-width: 768px) 50vw, calc(100vw - 48px)"
              className="object-cover"
            />
          </div>
        </div>
        <footer className="border-t border-slate-200 py-6">
          <div className="container mx-auto px-6 text-center text-slate-500 text-sm">
            © {new Date().getFullYear()} MascoTin
          </div>
        </footer>
      </section>
    </div>
  );
}
