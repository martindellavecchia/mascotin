import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function StoreNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">No encontramos este negocio</h1>
      <Button asChild className="mt-5">
        <Link href="/shop">Volver a negocios</Link>
      </Button>
    </div>
  );
}
