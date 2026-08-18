'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pencil, PawPrint, Plus, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import OwnerForm from '@/components/OwnerForm';
import PetForm from '@/components/PetForm';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { AboutCard } from '@/components/profile/AboutCard';
import { StatsCard } from '@/components/profile/StatsCard';
import { PetCard } from '@/components/profile/PetCard';
import { EmptyState } from '@/components/profile/EmptyState';
import type { Owner, Pet } from '@/types';
import { toast } from 'sonner';

function ProfileContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editMode = searchParams.get('edit');

  const [owner, setOwner] = useState<Owner | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [matches, setMatches] = useState<Pet[]>([]); // To count matches
  const [loading, setLoading] = useState(true);

  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [showPetForm, setShowPetForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);

  // Delete Logic
  const [deletingPet, setDeletingPet] = useState<Pet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const petIdParam = searchParams.get('petId');

  useEffect(() => {
    if (editMode === 'true') {
      setShowOwnerForm(true);
    }
  }, [editMode]);

  useEffect(() => {
    if (petIdParam && pets.length > 0 && !showPetForm) {
      const petToEdit = pets.find(p => p.id === petIdParam);
      if (petToEdit) {
        setEditingPet(petToEdit);
        setShowPetForm(true);
        // Optional: clear param to avoid reopening on refresh? 
        // For now keep it simple.
      }
    }
  }, [petIdParam, pets]);

  const fetchData = async () => {
    try {
      const [ownerRes, petsRes] = await Promise.all([
        fetch('/api/owner/profile'),
        fetch('/api/pet/mine')
      ]);

      const ownerData = await ownerRes.json();
      const petsData = await petsRes.json();

      setOwner(ownerData.owner);
      setPets(petsData.pets || []);

      if (ownerData.owner?.id) {
        try {
          const matchesRes = await fetch(`/api/matches?ownerId=${ownerData.owner.id}`);
          const matchesData = await matchesRes.json();
          setMatches(matchesData.matches || []);
        } catch (error) { }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePet = async () => {
    if (!deletingPet) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/pet/${deletingPet.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPets(pets.filter(p => p.id !== deletingPet.id));
        toast.success(`${deletingPet.name} ha sido eliminado`);
      } else {
        toast.error('Error al eliminar mascota');
      }
    } catch (error) {
      toast.error('Error al eliminar mascota');
    } finally {
      setIsDeleting(false);
      setDeletingPet(null);
    }
  };

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
          <p className="text-slate-500">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session) return null;

  if (!owner) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="mx-auto w-full max-w-2xl">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="size-8 text-teal-600" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Completá tu perfil</h1>
              <p className="mt-2 text-slate-500">Contanos sobre vos para empezar</p>
            </CardHeader>
            <CardContent>
              <OwnerForm
                userId={session.user.id}
                onSuccess={(newOwner) => setOwner(newOwner)}
              />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto min-w-0 w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto min-w-0 max-w-6xl">
          <PageHeader
            title="Mi perfil"
            description="Gestioná tu información y tus mascotas."
            action={<Button
              onClick={() => setShowOwnerForm(true)}
            >
              <Pencil className="mr-2 size-5" aria-hidden="true" />
              Editar perfil
            </Button>}
          />

          <div className="mt-8 grid min-w-0 gap-6 xl:grid-cols-3">
            {/* Left Column: Owner Info */}
            <div className="min-w-0 space-y-6 xl:col-span-1">
              <ProfileCard owner={owner} email={session.user.email || ''} />
              <AboutCard bio={owner.bio} onEdit={() => setShowOwnerForm(true)} />
              <StatsCard petsCount={pets.length} matchesCount={matches.length} />
            </div>

            {/* Middle Column: Pets */}
            <div className="min-w-0 space-y-6 xl:col-span-2">
              <div className="space-y-4 xl:col-span-2">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold text-slate-900">
                    <PawPrint className="size-5 text-teal-500" aria-hidden="true" />
                    Mis mascotas
                  </h2>
                  <Button
                    onClick={() => {
                      setEditingPet(null);
                      setShowPetForm(true);
                    }}
                    className="min-h-11 shrink-0 px-4"
                  >
                    <Plus className="mr-1 size-5" aria-hidden="true" />
                    Agregar
                  </Button>
                </div>
                {pets.length === 0 ? (
                  <EmptyState
                    onAddPet={() => {
                      setEditingPet(null);
                      setShowPetForm(true);
                    }}
                  />
                ) : (
                  <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    {pets.map((pet) => (
                      <PetCard
                        key={pet.id}
                        pet={pet}
                        onEdit={(p) => {
                          setEditingPet(p);
                          setShowPetForm(true);
                        }}
                        onDelete={(p) => setDeletingPet(p)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Modals */}

      {/* Edit Owner Modal */}
      {showOwnerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <Card className="relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto border-0 bg-white shadow-2xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 size-11 rounded-md hover:bg-slate-100 sm:right-4 sm:top-4"
              onClick={() => setShowOwnerForm(false)}
              aria-label="Cerrar edición de perfil"
            >
              <X className="size-5 text-slate-500" aria-hidden="true" />
            </Button>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-slate-900">Editar perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <OwnerForm
                userId={session.user.id}
                initialData={owner}
                onSuccess={(updatedOwner) => {
                  setOwner(updatedOwner);
                  setShowOwnerForm(false);
                  toast.success('Perfil actualizado correctamente');
                  if (editMode === 'true') router.replace('/profile');
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pet Form Modal (Create/Edit) */}
      {showPetForm && owner && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center overflow-y-auto bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="relative h-[100dvh] max-h-[100dvh] w-full max-w-full overflow-y-auto rounded-none border-0 bg-white shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl sm:rounded-xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 z-10 size-11 rounded-md hover:bg-slate-100 sm:right-4 sm:top-4"
              onClick={() => {
                setShowPetForm(false);
                setEditingPet(null);
              }}
              aria-label="Cerrar formulario de mascota"
            >
              <X className="size-5 text-slate-500" aria-hidden="true" />
            </Button>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-slate-900 pr-10">
                {editingPet ? 'Editar Mascota' : 'Registrar Nueva Mascota'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PetForm
                ownerId={owner.id}
                initialData={editingPet}
                onThumbnailChange={(updatedPet) => {
                  setPets((currentPets) => currentPets.map((pet) =>
                    pet.id === updatedPet.id ? updatedPet : pet
                  ));
                  setEditingPet((currentPet) =>
                    currentPet?.id === updatedPet.id ? updatedPet : currentPet
                  );
                }}
                onSuccess={(newPet) => {
                  if (editingPet) {
                    setPets((currentPets) => currentPets.map((pet) =>
                      pet.id === newPet.id ? newPet : pet
                    ));
                  } else {
                    setPets((currentPets) => [newPet, ...currentPets]);
                  }
                  setShowPetForm(false);
                  setEditingPet(null);
                }}
                onCancel={() => {
                  setShowPetForm(false);
                  setEditingPet(null);
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingPet} onOpenChange={(open) => !open && setDeletingPet(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Esta acción no se puede deshacer. Se eliminará permanentemente a
              <span className="font-bold text-slate-900"> {deletingPet?.name} </span>
              y toda su información.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePet}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
          <p className="text-slate-500">Cargando...</p>
        </div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
