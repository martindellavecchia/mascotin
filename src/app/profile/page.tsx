'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import Header from '@/components/Header';
import OwnerForm from '@/components/OwnerForm';
import PetForm from '@/components/PetForm';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { AboutCard } from '@/components/profile/AboutCard';
import { StatsCard } from '@/components/profile/StatsCard';
import { PetCard } from '@/components/profile/PetCard';
import { EmptyState } from '@/components/profile/EmptyState';
import QuickActions from '@/components/widgets/QuickActions';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
          <p className="text-gray-500">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session) return null;

  if (!owner) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header session={session} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="w-full max-w-2xl mx-auto shadow-sm border-0 bg-white">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-rounded text-3xl text-teal-600">person_add</span>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Completa tu Perfil</CardTitle>
              <p className="text-gray-500 mt-2">Cuéntanos sobre ti para comenzar</p>
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header session={session} />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header & Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
              <p className="text-gray-500 mt-1">Gestiona tu información y mascotas</p>
            </div>
            <Button
              onClick={() => setShowOwnerForm(true)}
              className="bg-teal-500 hover:bg-teal-600 text-white rounded-full px-6"
            >
              <span className="material-symbols-rounded text-lg mr-2">edit</span>
              Editar Perfil
            </Button>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Left Column: Owner Info */}
            <div className="lg:col-span-1 space-y-6">
              <ProfileCard owner={owner} email={session.user.email || ''} />
              <AboutCard bio={owner.bio} />
              <StatsCard petsCount={pets.length} matchesCount={matches.length} />
            </div>

            {/* Middle Column: Pets */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-sm border-0 bg-white">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="material-symbols-rounded text-teal-500">pets</span>
                      Mis Mascotas
                    </CardTitle>
                    <Button
                      onClick={() => {
                        setEditingPet(null);
                        setShowPetForm(true);
                      }}
                      className="bg-teal-500 hover:bg-teal-600 text-white rounded-full px-4"
                    >
                      <span className="material-symbols-rounded text-lg mr-1">add</span>
                      Agregar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {pets.length === 0 ? (
                    <EmptyState
                      onAddPet={() => {
                        setEditingPet(null);
                        setShowPetForm(true);
                      }}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar: Quick Actions */}
            <div className="lg:col-span-1 hidden lg:block">
              <div className="sticky top-24">
                <QuickActions />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}

      {/* Edit Owner Modal */}
      {showOwnerForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-0 bg-white relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 rounded-full hover:bg-gray-100"
              onClick={() => setShowOwnerForm(false)}
            >
              <span className="material-symbols-rounded text-gray-500">close</span>
            </Button>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Editar Perfil de Dueño</CardTitle>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-0 bg-white relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 rounded-full hover:bg-gray-100"
              onClick={() => setShowPetForm(false)}
            >
              <span className="material-symbols-rounded text-gray-500">close</span>
            </Button>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {editingPet ? 'Editar Mascota' : 'Registrar Nueva Mascota'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PetForm
                ownerId={owner.id}
                initialData={editingPet}
                onSuccess={(newPet) => {
                  if (editingPet) {
                    setPets(pets.map(p => p.id === newPet.id ? newPet : p));
                  } else {
                    setPets([newPet, ...pets]);
                  }
                  setShowPetForm(false);
                }}
                onCancel={() => setShowPetForm(false)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingPet} onOpenChange={(open) => !open && setDeletingPet(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              Esta acción no se puede deshacer. Se eliminará permanentemente a
              <span className="font-bold text-gray-900"> {deletingPet?.name} </span>
              y toda su información.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePet}
              disabled={isDeleting}
              className="bg-rose-500 hover:bg-rose-600 text-white border-0"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
