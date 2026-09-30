'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, PawPrint, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { StateFeedback } from '@/components/ui/state-feedback';
import { useInvalidateViewerData, useMatchCount, useMyPets, useOwnerProfile, viewerQueryKeys } from '@/hooks/useViewerData';
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
import { PetCompletionPrompt } from '@/components/pets/PetCompletionPrompt';
import { getMissingPetProfileFields } from '@/lib/pet-display';
import type { Owner, Pet } from '@/types';
import { toast } from 'sonner';

type ClosableModal = 'owner' | 'pet';

function ProfileContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editMode = searchParams.get('edit');

  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const ownerQuery = useOwnerProfile(userId);
  const petsQuery = useMyPets(userId);
  const matchCountQuery = useMatchCount(userId);
  const invalidateViewerData = useInvalidateViewerData();
  const owner = ownerQuery.data?.owner ?? null;
  const pets = petsQuery.data ?? [];
  const loading = ownerQuery.isPending || petsQuery.isPending;
  const setOwner = (nextOwner: Owner) => {
    queryClient.setQueryData(viewerQueryKeys.owner(userId), { ...ownerQuery.data, owner: nextOwner });
  };
  const setPets = (nextPets: Pet[] | ((current: Pet[]) => Pet[])) => {
    queryClient.setQueryData<Pet[]>(viewerQueryKeys.pets(userId), (current = []) =>
      typeof nextPets === 'function' ? nextPets(current) : nextPets
    );
  };

  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [showPetForm, setShowPetForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const ownerFormDirtyRef = useRef(false);
  const setOwnerFormDirty = useCallback((dirty: boolean) => { ownerFormDirtyRef.current = dirty; }, []);
  const [petFormDirty, setPetFormDirty] = useState(false);
  const petBusyRef = useRef(false);
  const setPetBusy = useCallback((busy: boolean) => { petBusyRef.current = busy; }, []);
  const petTriggerRef = useRef<HTMLElement | null>(null);
  const petFocusRef = useRef<HTMLElement | null>(null);
  const petDialogRef = useRef<HTMLDivElement>(null);
  const discardModalRef = useRef<ClosableModal | null>(null);
  const ownerBusyRef = useRef(false);
  const setOwnerBusy = useCallback((busy: boolean) => { ownerBusyRef.current = busy; }, []);
  const ownerTriggerRef = useRef<HTMLElement | null>(null);
  const ownerFocusRef = useRef<HTMLElement | null>(null);
  const ownerDialogRef = useRef<HTMLDivElement>(null);
  const profileMainRef = useRef<HTMLElement>(null);
  const openOwnerForm = () => {
    ownerTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setShowOwnerForm(true);
  };
  const restoreOwnerFocus = () => {
    const target = ownerTriggerRef.current?.isConnected ? ownerTriggerRef.current : profileMainRef.current;
    target?.focus();
  };
  const restorePetFocus = () => {
    const target = petTriggerRef.current?.isConnected ? petTriggerRef.current : profileMainRef.current;
    target?.focus();
  };
  const [pendingDiscard, setPendingDiscard] = useState<ClosableModal | null>(null);

  // Delete Logic
  const [deletingPet, setDeletingPet] = useState<Pet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const petIdParam = searchParams.get('petId');
  const handledPetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (editMode === 'true') {
      setShowOwnerForm(true);
    }
  }, [editMode]);

  useEffect(() => {
    if (!petIdParam) {
      handledPetIdRef.current = null;
      return;
    }
    if (handledPetIdRef.current === petIdParam) return;
    const petToEdit = pets.find(p => p.id === petIdParam);
    if (petToEdit) {
      handledPetIdRef.current = petIdParam;
      setEditingPet(petToEdit);
      setShowPetForm(true);
    }
  }, [petIdParam, pets]);

  const clearEditParams = () => {
    if (petIdParam || editMode) router.replace('/profile', { scroll: false });
  };

  const closeOwnerForm = () => {
    setShowOwnerForm(false);
    setOwnerFormDirty(false);
    clearEditParams();
  };

  const closePetForm = () => {
    setShowPetForm(false);
    setEditingPet(null);
    setPetFormDirty(false);
    clearEditParams();
  };

  const requestClose = (modal: ClosableModal) => {
    if (pendingDiscard || (modal === 'owner' ? ownerBusyRef.current : petBusyRef.current)) return;
    const dirty = modal === 'owner' ? ownerFormDirtyRef.current : petFormDirty;
    if (dirty) {
      discardModalRef.current = modal;
      const focusRef = modal === 'owner' ? ownerFocusRef : petFocusRef;
      focusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPendingDiscard(modal);
      return;
    }
    if (modal === 'owner') closeOwnerForm();
    else closePetForm();
  };

  const openPetForm = (pet: Pet | null) => {
    petTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditingPet(pet);
    setPetFormDirty(false);
    setShowPetForm(true);
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
        invalidateViewerData();
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

  if ((ownerQuery.isError && !ownerQuery.data) || (petsQuery.isError && !petsQuery.data)) {
    return <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <StateFeedback status="error" title="No pudimos cargar tu perfil" action={
        <Button variant="outline" onClick={() => { void ownerQuery.refetch(); void petsQuery.refetch(); }}>Reintentar</Button>
      } />
    </main>;
  }

  if (!owner || !owner.location?.trim()) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="container mx-auto flex-1 px-4 py-4 sm:py-8">
          <Card className="mx-auto w-full max-w-2xl">
            <CardHeader className="pb-0">
              <h1 className="text-2xl font-bold text-slate-900">Completá tu perfil</h1>
              <p className="text-sm leading-6 text-muted-foreground">Tu nombre y zona para presentarte. El resto es opcional.</p>
            </CardHeader>
            <CardContent>
              <OwnerForm
                userId={session.user.id}
                initialData={owner ?? undefined}
                defaultName={session.user.name || undefined}
                onSuccess={(newOwner) => setOwner(newOwner)}
              />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const incompletePets = pets
    .map((pet) => ({ pet, missing: getMissingPetProfileFields(pet) }))
    .filter(({ missing }) => missing.length > 0);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main ref={profileMainRef} tabIndex={-1} className="mx-auto min-w-0 w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto min-w-0 max-w-6xl">
          <PageHeader
            title="Mi perfil"
            description="Gestioná tu información y tus mascotas."
            action={<Button
              onClick={openOwnerForm}
            >
              <Pencil className="mr-2 size-5" aria-hidden="true" />
              Editar perfil
            </Button>}
          />

          <div className="mt-8 grid min-w-0 gap-6 xl:grid-cols-3">
            {/* Left Column: Owner Info */}
            <div className="min-w-0 space-y-6 xl:col-span-1">
              <ProfileCard owner={owner} email={session.user.email || ''} />
              <AboutCard bio={owner.bio} onEdit={openOwnerForm} />
              <StatsCard petsCount={pets.length} matchesCount={matchCountQuery.data} />
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
                    onClick={() => openPetForm(null)}
                    className="min-h-11 shrink-0 px-4"
                  >
                    <Plus className="mr-1 size-5" aria-hidden="true" />
                    Agregar
                  </Button>
                </div>
                {incompletePets.map(({ pet, missing }) => (
                  <PetCompletionPrompt
                    key={pet.id}
                    petName={pet.name}
                    missingFields={missing}
                    onComplete={() => openPetForm(pet)}
                  />
                ))}
                {pets.length === 0 ? (
                  <EmptyState onAddPet={() => openPetForm(null)} />
                ) : (
                  <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    {pets.map((pet) => (
                      <PetCard
                        key={pet.id}
                        pet={pet}
                        onEdit={(p) => openPetForm(p)}
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
      <Dialog open={showOwnerForm} onOpenChange={(open) => { if (!open) requestClose('owner'); }}>
        <DialogContent
          ref={ownerDialogRef}
          className="sm:max-w-2xl"
          onInteractOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => { event.preventDefault(); restoreOwnerFocus(); }}
        >
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>Actualizá tu información y guardá los cambios cuando termines.</DialogDescription>
          </DialogHeader>
          <OwnerForm
            userId={session.user.id}
            initialData={owner}
            onDirtyChange={setOwnerFormDirty}
            onBusyChange={setOwnerBusy}
            onCancel={() => requestClose('owner')}
            onSuccess={(updatedOwner) => {
              setOwner(updatedOwner);
              closeOwnerForm();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Pet Form Modal (Create/Edit) */}
      <Dialog open={showPetForm} onOpenChange={(open) => { if (!open) requestClose('pet'); }}>
        <DialogContent
          ref={petDialogRef}
          aria-modal="true"
          className="sm:max-w-2xl"
          onInteractOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => { event.preventDefault(); restorePetFocus(); }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingPet ? 'Editar mascota' : 'Registrar nueva mascota'}
            </DialogTitle>
            <DialogDescription>Completá la información de tu mascota y guardá los cambios cuando termines.</DialogDescription>
          </DialogHeader>
          <PetForm
            key={editingPet?.id ?? 'new'}
            ownerId={owner.id}
            initialData={editingPet}
            onDirtyChange={setPetFormDirty}
            onBusyChange={setPetBusy}
            onSuccess={(newPet) => {
              if (editingPet) {
                setPets((currentPets) => currentPets.map((pet) =>
                  pet.id === newPet.id ? newPet : pet
                ));
              } else {
                setPets((currentPets) => [newPet, ...currentPets]);
              }
              closePetForm();
            }}
            onCancel={() => requestClose('pet')}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDiscard !== null}
        onOpenChange={(open) => !open && setPendingDiscard(null)}
        onCloseAutoFocus={(event) => {
          if (discardModalRef.current === 'pet') {
            event.preventDefault();
            if (petDialogRef.current) {
              const target = petFocusRef.current?.isConnected ? petFocusRef.current : petDialogRef.current.querySelector<HTMLElement>('input, button');
              target?.focus();
            } else restorePetFocus();
          } else if (ownerDialogRef.current) {
            event.preventDefault();
            const target = ownerFocusRef.current?.isConnected ? ownerFocusRef.current : ownerDialogRef.current.querySelector<HTMLElement>('input, button');
            target?.focus();
          } else if (ownerTriggerRef.current) {
            event.preventDefault();
            restoreOwnerFocus();
          }
        }}
        title="¿Descartar cambios?"
        description="Tenés cambios sin guardar. Si cerrás ahora, se van a perder."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        destructive
        onConfirm={() => {
          if (pendingDiscard === 'owner') closeOwnerForm();
          if (pendingDiscard === 'pet') closePetForm();
          setPendingDiscard(null);
        }}
      />

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
