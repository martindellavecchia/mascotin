import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, HeartHandshake, Store, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-static';

export default function GuestHomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-14 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-primary">
            Comunidad para personas y mascotas
          </p>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-[-0.045em] text-foreground sm:text-5xl lg:text-6xl">
            Conocé mascotas, coordiná ayuda y encontrá servicios confiables.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Huella reúne encuentros, comunidad, hogares de tránsito y comercios de cercanía en una experiencia simple y segura.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="px-7 text-base">
              <Link href="/register">
                Crear mi cuenta
                <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-7 text-base">
              <Link href="/login">Ya tengo cuenta</Link>
            </Button>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">Gratis para la comunidad. Tus datos personales permanecen privados.</p>
        </div>

        <div className="relative min-h-[24rem] overflow-hidden rounded-xl border border-border bg-surface sm:min-h-[32rem]">
          <Image
            src="/images/hero-dogs.webp"
            alt="Dos perros jugando al aire libre"
            fill
            sizes="(min-width: 1024px) 48vw, calc(100vw - 32px)"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-x-4 bottom-4 rounded-lg border border-white/60 bg-white/92 p-4 backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-5">
            <p className="font-semibold text-foreground">Una red local para cada etapa</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Desde conocer un compañero de paseo hasta coordinar un tránsito responsable.</p>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-7xl divide-y divide-border px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-8">
          {[
            { icon: Users, title: 'Encuentros y comunidad', copy: 'Perfiles, publicaciones, grupos y eventos de tu zona.' },
            { icon: HeartHandshake, title: 'Ayuda coordinada', copy: 'Hogares de tránsito, adopciones y seguimiento privado.' },
            { icon: Store, title: 'Servicios de confianza', copy: 'Comercios, profesionales y reputación verificada.' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex gap-4 py-7 md:px-7 md:first:pl-0 md:last:pr-0">
                <Icon className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.copy}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-2 md:items-center lg:px-8">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border">
          <Image
            src="/images/community-dog.webp"
            alt="Persona compartiendo tiempo con su perro en casa"
            fill
            sizes="(min-width: 768px) 50vw, calc(100vw - 32px)"
            className="object-cover"
          />
        </div>
        <div className="max-w-xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-highlight">Cerca y con contexto</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Menos ruido. Más información útil para decidir.</h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Cada recorrido prioriza datos reales, acciones claras y privacidad. Sin puntajes inventados, recomendaciones vacías ni pantallas llenas de tarjetas.
          </p>
          <Button asChild variant="link" className="mt-5 h-auto p-0 text-base">
            <Link href="/shop">Explorar servicios <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border bg-surface py-7">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Huella</p>
          <p>Hecho para comunidades que cuidan.</p>
        </div>
      </footer>
    </main>
  );
}
