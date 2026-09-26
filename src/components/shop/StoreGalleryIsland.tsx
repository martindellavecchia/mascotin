'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { shouldUnoptimizeImage } from '@/lib/media';

function isSafeImageSource(source: string) {
  if (source.startsWith('/') && !source.startsWith('//')) return true;
  return /^https?:\/\//i.test(source);
}

export default function StoreGalleryIsland({ images, storeName }: { images: string[]; storeName: string }) {
  const photos = images.filter(isSafeImageSource);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!photos.length) return null;

  const active = activeIndex === null ? null : photos[activeIndex];
  const move = (delta: number) =>
    setActiveIndex((current) => (current === null ? current : (current + delta + photos.length) % photos.length));

  return (
    <section aria-labelledby="store-gallery-title">
      <h2 id="store-gallery-title" className="text-xl font-bold text-slate-900">Fotos</h2>
      <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {photos.map((src, index) => (
          <li key={`${src}-${index}`}>
            <button
              type="button"
              onClick={() => setActiveIndex(index)}
              className="relative block aspect-square w-full overflow-hidden rounded-lg bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              aria-label={`Ver foto ${index + 1} de ${photos.length} de ${storeName}`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 160px"
                unoptimized={shouldUnoptimizeImage(src)}
                className="object-cover transition-transform hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setActiveIndex(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{storeName}</DialogTitle>
            <DialogDescription>
              Foto {(activeIndex ?? 0) + 1} de {photos.length}
            </DialogDescription>
          </DialogHeader>
          {active && (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100">
              <Image
                src={active}
                alt={`Foto ${(activeIndex ?? 0) + 1} de ${storeName}`}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                unoptimized={shouldUnoptimizeImage(active)}
                className="object-contain"
              />
            </div>
          )}
          {photos.length > 1 && (
            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => move(-1)}>
                <ChevronLeft className="mr-1 size-5" aria-hidden="true" />
                Anterior
              </Button>
              <Button type="button" variant="outline" onClick={() => move(1)}>
                Siguiente
                <ChevronRight className="ml-1 size-5" aria-hidden="true" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
