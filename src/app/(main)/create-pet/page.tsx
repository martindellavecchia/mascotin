'use client';

import { useSession } from 'next-auth/react';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sanitizeCallbackUrl } from '@/lib/callback-url';
import { LoaderCircle } from 'lucide-react';
import PetOnboardingWizard from '@/components/onboarding/PetOnboardingWizard';

function CreatePetContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  useEffect(() => {
    if (status === 'unauthenticated') {
      const destination = returnTo ? `/create-pet?returnTo=${encodeURIComponent(sanitizeCallbackUrl(returnTo))}` : '/create-pet';
      router.push(`/login?callbackUrl=${encodeURIComponent(destination)}`);
    }
  }, [status, router, returnTo]);

  if (status === 'unauthenticated') return null;
  if (status === 'loading' || !session?.user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoaderCircle className="size-12 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto flex w-full max-w-4xl flex-1 justify-center px-4 py-6 sm:px-6 sm:py-10">
        <PetOnboardingWizard
          onSuccess={(pet) => router.push(returnTo ? sanitizeCallbackUrl(returnTo) : `/inicio?tab=explore&petId=${pet.id}`)}
          onCancel={() => router.back()}
        />
      </main>
    </div>
  );
}

export default function CreatePetPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background">
      <LoaderCircle className="size-12 animate-spin text-primary" aria-hidden="true" />
    </div>}>
      <CreatePetContent />
    </Suspense>
  );
}
