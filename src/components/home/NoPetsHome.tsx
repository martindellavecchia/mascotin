'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PawPrint, Plus } from 'lucide-react';
import IntentEntry from '@/components/home/IntentEntry';
import PendingActions from '@/components/home/PendingActions';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getHomeTab } from '@/lib/home-navigation';

export default function NoPetsHome() {
  const params = useSearchParams();
  const isDiscover = getHomeTab(params.get('tab')) === 'explore';

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-1 flex-col justify-center px-4 py-6">
      {!isDiscover && <IntentEntry />}
      {!isDiscover && <PendingActions />}
      <EmptyState
        headingLevel="h1"
        icon={<PawPrint className="size-11" aria-hidden="true" />}
        title={isDiscover ? 'Creá una mascota para empezar a descubrir' : 'También podés crear el perfil de tu mascota'}
        description={isDiscover
          ? 'Solo te vamos a pedir el nombre y el tipo. No necesitás foto y después volvés directo a Descubrir.'
          : 'Si querés conocer compañía compatible, empezá con el nombre y el tipo. Para adoptar, ayudar o buscar servicios no necesitás una mascota.'}
        action={<Button asChild><Link href="/create-pet"><Plus className="mr-2 size-5" aria-hidden="true" />Crear perfil básico</Link></Button>}
      />
    </main>
  );
}
