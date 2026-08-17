'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { petSchema } from '@/lib/schemas';
import { toast } from 'sonner';
import { BasicInfoSection } from './BasicInfoSection';
import { HealthSection } from './HealthSection';
import { DetailsSection } from './DetailsSection';
import { ActivitiesSection } from './ActivitiesSection';
import CompatibilityFields from '@/components/pets/CompatibilityFields';
import { parseJsonStringArray } from '@/lib/json-array';
import type { Pet } from '@/types';
import {
  isRenderableImage,
  normalizePetImageSelection,
  parseImageUrls,
  shouldUnoptimizeImage,
} from '@/lib/media';

const TEMPERAMENT_OPTIONS = ['sociable', 'territorial', 'anxious', 'playful', 'calm', 'independent'] as const;
const MATCH_INTENT_OPTIONS = ['walk', 'play', 'social', 'sit'] as const;
type TemperamentOption = (typeof TEMPERAMENT_OPTIONS)[number];
type MatchIntentOption = (typeof MATCH_INTENT_OPTIONS)[number];

function parseTemperamentOptions(value: unknown): TemperamentOption[] {
  return parseJsonStringArray(value).filter((tag): tag is TemperamentOption =>
    TEMPERAMENT_OPTIONS.includes(tag as TemperamentOption)
  );
}

function parseMatchIntentOptions(value: unknown): MatchIntentOption[] {
  return parseJsonStringArray(value).filter((item): item is MatchIntentOption =>
    MATCH_INTENT_OPTIONS.includes(item as MatchIntentOption)
  );
}

interface PetFormProps {
  ownerId: string;
  initialData?: any;
  onSuccess?: (pet: any) => void;
  onThumbnailChange?: (pet: Pet) => void;
  onCancel?: () => void;
}

const ACTIVITY_OPTIONS = ['walk', 'play', 'fetch', 'swim', 'socialize', 'groom', 'training'] as const;
type ActivityOption = (typeof ACTIVITY_OPTIONS)[number];

function isActivityOption(value: unknown): value is ActivityOption {
  return typeof value === 'string' && ACTIVITY_OPTIONS.includes(value as ActivityOption);
}
function parseActivities(activitiesData: unknown): ActivityOption[] {
  if (!activitiesData) return [];

  if (Array.isArray(activitiesData)) {
    return activitiesData.filter(isActivityOption);
  }

  if (typeof activitiesData === 'string') {
    try {
      const parsed = JSON.parse(activitiesData);
      return Array.isArray(parsed) ? parsed.filter(isActivityOption) : [];
    } catch {
      return [];
    }
  }

  return [];
}

export default function PetForm({ ownerId, initialData, onSuccess, onThumbnailChange, onCancel }: PetFormProps) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>(parseImageUrls(initialData?.images));
  const [uploading, setUploading] = useState(false);
  const [thumbnailIndex, setThumbnailIndex] = useState<number>(initialData?.thumbnailIndex ?? 0);
  const [savingThumbnailIndex, setSavingThumbnailIndex] = useState<number | null>(null);

  const form = useForm({
    resolver: zodResolver(petSchema),
    defaultValues: {
      name: initialData?.name || '',
      petType: initialData?.petType || 'dog',
      breed: initialData?.breed || '',
      age: initialData?.age || 1,
      weight: initialData?.weight || undefined,
      size: initialData?.size || 'medium',
      gender: initialData?.gender || 'male',
      vaccinated: initialData?.vaccinated ?? true,
      neutered: initialData?.neutered ?? false,
      energy: initialData?.energy || 'medium',
      bio: initialData?.bio || '',
      activities: parseActivities(initialData?.activities),
      location: initialData?.location || '',
      images: parseImageUrls(initialData?.images),
      goodWithKids: initialData?.goodWithKids || 'unknown',
      goodWithDogs: initialData?.goodWithDogs || 'unknown',
      goodWithCats: initialData?.goodWithCats || 'unknown',
      goodWithStrangers: initialData?.goodWithStrangers || 'unknown',
      temperament: parseTemperamentOptions(initialData?.temperament),
      matchIntent: parseMatchIntentOptions(initialData?.matchIntent),
      microchipId: initialData?.microchipId || '',
      allergies: initialData?.allergies || '',
      specialNeeds: initialData?.specialNeeds || '',
      vetClinicName: initialData?.vetClinicName || '',
      sharePhoneOnScan: initialData?.sharePhoneOnScan ?? false,
      shareVetOnScan: initialData?.shareVetOnScan ?? false,
    },
  });

  const persistThumbnailSelection = async (
    nextImages: string[],
    nextIndex: number,
    previousIndex: number
  ): Promise<boolean> => {
    setThumbnailIndex(nextIndex);

    if (!initialData?.id) {
      toast.success('Foto principal seleccionada');
      return true;
    }

    setSavingThumbnailIndex(nextIndex);

    try {
      const response = await fetch(`/api/pet/${initialData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: JSON.stringify(nextImages),
          thumbnailIndex: nextIndex,
        }),
      });
      const data = await response.json().catch(() => null) as { pet?: Pet; error?: string } | null;

      if (!response.ok || !data?.pet) {
        throw new Error(data?.error || 'No se pudo actualizar la foto de perfil');
      }

      onThumbnailChange?.(data.pet);
      toast.success('Foto de perfil actualizada');
      return true;
    } catch (error) {
      setThumbnailIndex(previousIndex);
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la foto de perfil');
      return false;
    } finally {
      setSavingThumbnailIndex(null);
    }
  };

  const handleThumbnailSelection = async (index: number) => {
    if (savingThumbnailIndex !== null) return;

    if (index === thumbnailIndex) {
      toast.info('Esta ya es la foto de perfil');
      return;
    }

    await persistThumbnailSelection(images, index, thumbnailIndex);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || images.length >= 6) return;

    const newImages: string[] = [];
    setUploading(true);

    try {
      for (let i = 0; i < files.length && images.length + newImages.length < 6; i++) {
        const file = files[i];

        if (file.size > 5 * 1024 * 1024) {
          toast.error('La imagen debe ser menor a 5MB');
          continue;
        }

        if (!file.type.startsWith('image/')) {
          toast.error('Solo se permiten imágenes');
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => null) as { error?: string } | null;
          toast.error(error?.error || `Error al subir imagen: ${response.status}`);
          continue;
        }

        const data = await response.json() as { url?: string; error?: string };
        if (data.url && isRenderableImage(data.url)) {
          newImages.push(data.url);
        } else if (data.error) {
          toast.error(data.error);
        } else {
          toast.error('La imagen procesada no tiene un formato compatible');
        }
      }

      if (newImages.length > 0) {
        const updatedImages = [...images, ...newImages];
        const nextThumbnailIndex = images.length;
        setImages(updatedImages);
        form.setValue('images', updatedImages, { shouldValidate: true });
        await persistThumbnailSelection(updatedImages, nextThumbnailIndex, thumbnailIndex);
      }
    } catch {
        toast.error('Error al subir imagen. Inténtalo de nuevo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onSubmit = async (values: any) => {

    // Verificar explícitamente las imágenes
    let finalImages = values.images;
    if (!finalImages || (Array.isArray(finalImages) && finalImages.length === 0)) {
      finalImages = images;
    }

    if (!finalImages || (Array.isArray(finalImages) && finalImages.length === 0)) {
      toast.error('Debes subir al menos una imagen de tu mascota');
      return;
    }

    const imageSelection = normalizePetImageSelection(finalImages, thumbnailIndex);
    if (!imageSelection) {
      toast.error('Las imágenes de la mascota no tienen un formato compatible');
      return;
    }

    setLoading(true);

    try {
      const isEditing = !!initialData?.id;
      const payload = {
        ...values,
        ownerId,
        images: JSON.stringify(imageSelection.images),
        thumbnailIndex: imageSelection.thumbnailIndex,
        activities: Array.isArray(values.activities) ? values.activities : [values.activities].filter(Boolean),
      };


      const url = isEditing ? `/api/pet/${initialData.id}` : '/api/pet/create';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(isEditing ? '¡Mascota actualizada exitosamente!' : '¡Mascota registrada exitosamente!');
        if (onSuccess) onSuccess(data.pet);
      } else {
        toast.error(data.error || 'Error al guardar mascota');
      }
    } catch (error) {
      toast.error('Error al guardar mascota');
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = (errors: any) => {

    // Mostrar errores en toast
    const errorMessages = Object.values(errors).map((err: any) => err?.message || JSON.stringify(err));
    if (errorMessages.length > 0) {
      toast.error('Errores en el formulario: ' + errorMessages.join(', '));
    } else {
      toast.error('Hay errores en el formulario. Revisa los campos.');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Mascota</FormLabel>
              <FormControl>
                <Input placeholder="Fido, Michi..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="petType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="dog">Perro</SelectItem>
                    <SelectItem value="cat">Gato</SelectItem>
                    <SelectItem value="bird">Ave</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="breed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Raza (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Golden Retriever, Siames..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Edad (años)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 5.5"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tamaño</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Tamaño" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="small">Pequeño</SelectItem>
                    <SelectItem value="medium">Mediano</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                    <SelectItem value="xlarge">Extra Grande</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sexo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sexo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Macho</SelectItem>
                    <SelectItem value="female">Hembra</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="energy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nivel de Energía</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Energía" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <Label className="text-slate-700 font-medium">Estado de Salud</Label>
          <div className="flex flex-wrap gap-4">
            <FormField
              control={form.control}
              name="vaccinated"
              render={({ field }) => (
                <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${field.value
                  ? 'bg-teal-50 border-teal-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="sr-only"
                  />
                  <span className={`material-symbols-rounded text-xl ${field.value ? 'text-teal-600' : 'text-slate-400'}`}>vaccines</span>
                  <span className={`text-sm font-medium ${field.value ? 'text-teal-700' : 'text-slate-700'}`}>
                    {form.watch('gender') === 'female' ? 'Vacunada' : 'Vacunado'}
                  </span>
                </label>
              )}
            />

            <FormField
              control={form.control}
              name="neutered"
              render={({ field }) => (
                <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${field.value
                  ? 'bg-teal-50 border-teal-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="sr-only"
                  />
                  <span className={`material-symbols-rounded text-xl ${field.value ? 'text-teal-600' : 'text-slate-400'}`}>medical_services</span>
                  <span className={`text-sm font-medium ${field.value ? 'text-teal-700' : 'text-slate-700'}`}>
                    {form.watch('gender') === 'female' ? 'Castrada' : 'Castrado'}
                  </span>
                </label>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ubicación</FormLabel>
              <FormControl>
                <Input placeholder="Ciudad, País" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Biografía de la Mascota</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Cuéntanos sobre tu mascota..."
                  className="resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <Label className="text-slate-700 font-medium">Actividades Favoritas</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: 'walk', label: 'Pasear', icon: 'directions_walk' },
              { id: 'play', label: 'Jugar', icon: 'sports_tennis' },
              { id: 'fetch', label: 'Buscar', icon: 'toys' },
              { id: 'swim', label: 'Nadar', icon: 'pool' },
              { id: 'socialize', label: 'Socializar', icon: 'groups' },
              { id: 'groom', label: 'Aseo', icon: 'content_cut' },
              { id: 'training', label: 'Entrenar', icon: 'school' }
            ].map((activity) => (
              <label
                key={activity.id}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${form.watch('activities')?.includes(activity.id as ActivityOption)
                  ? 'bg-teal-50 border-teal-300 text-teal-700'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
              >
                <input
                  type="checkbox"
                  value={activity.id}
                  checked={form.watch('activities')?.includes(activity.id as ActivityOption)}
                  onChange={(e) => {
                    const current = (form.watch('activities') || []) as ActivityOption[];
                    if (e.target.checked) {
                      form.setValue('activities', [...current, activity.id as ActivityOption]);
                    } else {
                      form.setValue('activities', current.filter((a) => a !== activity.id));
                    }
                  }}
                  className="sr-only"
                />
                <span className="material-symbols-rounded text-lg text-teal-700">{activity.icon}</span>
                <span className="text-sm font-medium">{activity.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">Selecciona al menos una actividad</p>
        </div>

        <div className="space-y-3">
          <Label className="text-slate-700 font-medium">Pasaporte y compatibilidad</Label>
          <CompatibilityFields
            data={{
              goodWithKids: form.watch('goodWithKids'),
              goodWithDogs: form.watch('goodWithDogs'),
              goodWithCats: form.watch('goodWithCats'),
              goodWithStrangers: form.watch('goodWithStrangers'),
              temperament: form.watch('temperament'),
              matchIntent: form.watch('matchIntent'),
            }}
            onChange={(field, value) => form.setValue(field as 'goodWithKids', value as never)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="microchipId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Microchip</FormLabel>
                <FormControl>
                  <Input placeholder="Opcional" {...field} value={field.value || ''} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vetClinicName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Veterinaria</FormLabel>
                <FormControl>
                  <Input placeholder="Clínica de cabecera" {...field} value={field.value || ''} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="allergies"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alergias</FormLabel>
                <FormControl>
                  <Input placeholder="Si las hay" {...field} value={field.value || ''} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="specialNeeds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Necesidades especiales</FormLabel>
                <FormControl>
                  <Input placeholder="Cuidados extra" {...field} value={field.value || ''} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <Label className="text-slate-700 font-medium">Privacidad al escanear QR</Label>
          <p className="text-xs text-slate-500">Controla qué datos se muestran en el pasaporte público</p>
          <div className="flex flex-col gap-3">
            <FormField
              control={form.control}
              name="sharePhoneOnScan"
              render={({ field }) => (
                <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${field.value
                  ? 'bg-teal-50 border-teal-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="sr-only"
                  />
                  <span className="material-symbols-rounded text-xl text-teal-600">phone</span>
                  <div>
                    <span className={`text-sm font-medium block ${field.value ? 'text-teal-700' : 'text-slate-700'}`}>
                      Compartir teléfono
                    </span>
                    <span className="text-xs text-slate-500">Mostrar tu número al escanear el pasaporte</span>
                  </div>
                </label>
              )}
            />
            <FormField
              control={form.control}
              name="shareVetOnScan"
              render={({ field }) => (
                <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${field.value
                  ? 'bg-teal-50 border-teal-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="sr-only"
                  />
                  <span className="material-symbols-rounded text-xl text-teal-600">local_hospital</span>
                  <div>
                    <span className={`text-sm font-medium block ${field.value ? 'text-teal-700' : 'text-slate-700'}`}>
                      Compartir veterinaria
                    </span>
                    <span className="text-xs text-slate-500">Mostrar la clínica de cabecera al escanear</span>
                  </div>
                </label>
              )}
            />
          </div>
        </div>

        <div>
          <Label>Imágenes ({images.length}/6)</Label>
          <p className="text-xs text-slate-500 mb-2">
            {initialData?.id
              ? 'Elegí una estrella y la foto principal se guardará automáticamente.'
              : 'Elegí una estrella para definir la foto principal.'}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-4">
            {images.map((image, index) => {
              const isThumbnail = thumbnailIndex === index;
              const isSavingThumbnail = savingThumbnailIndex === index;

              return (
                <div
                  key={index}
                  className={`relative aspect-square rounded-lg overflow-hidden bg-teal-100 ${isThumbnail ? 'ring-4 ring-teal-500' : ''}`}
                >
                {isRenderableImage(image) ? (
                  <Image
                    src={image}
                    alt={`Foto ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 30vw, 180px"
                    unoptimized={shouldUnoptimizeImage(image)}
                    className="object-cover"
                  />
                ) : (
                  <span className="material-symbols-rounded flex h-full items-center justify-center text-4xl text-teal-700">
                    broken_image
                  </span>
                )}
                <Button
                  type="button"
                  variant={isThumbnail ? "default" : "outline"}
                  size="icon"
                  className={`absolute top-2 left-2 size-7 gap-0 rounded-full p-0 ${isThumbnail ? 'bg-teal-500 hover:bg-teal-600' : 'bg-white/80 hover:bg-teal-50'}`}
                  onClick={() => void handleThumbnailSelection(index)}
                  disabled={savingThumbnailIndex !== null}
                  title={isThumbnail ? 'Foto de perfil actual' : 'Usar como foto de perfil'}
                  aria-label={isThumbnail ? `Foto ${index + 1} es la foto de perfil actual` : `Usar Foto ${index + 1} como foto de perfil`}
                  aria-pressed={isThumbnail}
                >
                  <span className={`material-symbols-rounded text-[16px] leading-none ${isThumbnail ? 'text-white filled' : 'text-slate-500'} ${isSavingThumbnail ? 'animate-spin' : ''}`}>
                    {isSavingThumbnail ? 'progress_activity' : 'star'}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 size-7 gap-0 rounded-full p-0"
                  onClick={() => {
                    const newImages = images.filter((_, i) => i !== index);
                    setImages(newImages);
                    form.setValue('images', newImages);
                    if (thumbnailIndex >= newImages.length) {
                      setThumbnailIndex(Math.max(0, newImages.length - 1));
                    } else if (thumbnailIndex > index) {
                      setThumbnailIndex(thumbnailIndex - 1);
                    }
                  }}
                  aria-label="Eliminar foto"
                >
                  <span className="material-symbols-rounded text-[16px] leading-none">close</span>
                </Button>
                {isThumbnail && (
                  <div className="absolute bottom-0 left-0 right-0 bg-teal-500 text-white text-xs text-center py-1 font-medium">
                    {isSavingThumbnail ? 'Guardando...' : 'Foto principal actual'}
                  </div>
                )}
              </div>
              );
            })}

            {images.length < 6 && (
              <div className="aspect-square rounded-lg border-2 border-dashed border-teal-300 flex items-center justify-center bg-teal-50">
                <label htmlFor="image-upload" className="cursor-pointer text-center w-full h-full flex flex-col items-center justify-center">
                  {uploading ? (
                    <span className="material-symbols-rounded text-[24px] leading-none text-teal-500 animate-spin">progress_activity</span>
                  ) : (
                    <>
                      <span className="material-symbols-rounded text-[32px] leading-none mb-2 text-teal-500">upload</span>
                      <p className="text-sm text-slate-600">Subir foto</p>
                    </>
                  )}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Máximo 6 imágenes. Formatos: JPG, PNG. Máximo 5MB por imagen.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onCancel}
              disabled={loading || uploading || savingThumbnailIndex !== null}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" className="w-full flex-1 bg-teal-500 hover:bg-teal-600 text-white rounded-lg" disabled={loading || uploading || savingThumbnailIndex !== null}>
            {loading ? (
              <>
                <span className="material-symbols-rounded text-[16px] leading-none mr-2 animate-spin">progress_activity</span>
                {initialData?.id ? 'Actualizando...' : 'Guardando...'}
              </>
            ) : (
              initialData?.id ? 'Actualizar Mascota' : 'Guardar Mascota'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}


