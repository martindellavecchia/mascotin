'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import PetForm from '@/components/PetForm';
import OwnerForm from '@/components/OwnerForm';
import type { Owner, Pet } from '@/types';
import PetOnboardingWizard from '@/components/onboarding/PetOnboardingWizard';

function CreatePetContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchOwner();
    }
  }, [session]);

  const fetchOwner = async () => {
    try {
      const res = await fetch('/api/owner/profile');
      const data = await res.json();
      if (data.owner) {
        setOwner(data.owner);
      }
    } catch (error) {
      console.error('Error fetching owner:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'unauthenticated') return null;
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex items-center justify-center">
        <span className="material-symbols-rounded w-12 h-12 text-teal-500 animate-spin">pending</span>
      </div>
    );
  }
  if (!owner) {
    return (
      <div className="min-h-screen bg-[#f8fcfa] flex flex-col">
        <Header session={session} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="w-full max-w-2xl mx-auto shadow-sm border-0 bg-white">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-rounded text-3xl text-teal-600">person_add</span>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Completa tu Perfil de Dueño
              </CardTitle>
              <p className="text-gray-500 mt-2">
                Antes de registrar una mascota, necesitamos algunos datos sobre ti
              </p>
            </CardHeader>
            <CardContent>
              <OwnerForm
                userId={session!.user.id}
                onSuccess={(newOwner) => setOwner(newOwner)}
                onCancel={() => router.back()}
              />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fcfa] flex flex-col">
      <Header session={session} />
      <main className="flex-1 container mx-auto px-4 py-8 flex justify-center">
        <PetOnboardingWizard
          ownerId={owner.id}
          onSuccess={() => router.push('/')}
          onCancel={() => router.back()}
        />
      </main>
    </div>
  );
}

export default function CreatePetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-green-200 border-t-teal-500 rounded-full animate-spin" />
    </div>}>
      <CreatePetContent />
    </Suspense>
  );
}
