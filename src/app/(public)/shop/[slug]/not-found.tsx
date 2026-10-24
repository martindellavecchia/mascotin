import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function StoreNotFound() {
  return (
    <div className="min-h-screen bg-background px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-foreground">No encontramos este negocio</h1>
      <Button asChild className="mt-5">
        <Link href="/shop">Volver a negocios</Link>
      </Button>
    </div>
  );
}
