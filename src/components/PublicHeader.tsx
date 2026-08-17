import Link from 'next/link';
import { PawPrint } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-full min-w-0 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-h-11 min-w-0 items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-600">
            <PawPrint className="size-5 text-white" aria-hidden="true" />
          </div>
          <span className="truncate text-[19px] font-bold tracking-[-0.03em] text-slate-950 sm:text-[22px]">
            MascoTin
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" className="hidden min-h-11 text-slate-600 sm:inline-flex">
            <Link href="/shop">Servicios</Link>
          </Button>
          <Button asChild className="min-h-11 bg-teal-600 hover:bg-teal-700">
            <Link href="/inicio">Ir a la app</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
