'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Circle,
  GraduationCap,
  Hospital,
  ImageOff,
  Leaf,
  LoaderCircle,
  Phone,
  Scissors,
  Star,
  Stethoscope,
  Syringe,
  Upload,
  Users,
  Waves,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import CompatibilityFields from '@/components/pets/CompatibilityFields';
import { useInvalidateViewerData } from '@/hooks/useViewerData';
import { petSchema, type PetFormData } from '@/lib/schemas';
import { parseJsonStringArray } from '@/lib/json-array';
import {
  isRenderableImage,
  normalizePetImageSelection,
  parseImageUrls,
  shouldUnoptimizeImage,
} from '@/lib/media';
import { hasPetAge } from '@/lib/pet-display';
import { cn } from '@/lib/utils';
import type { Pet } from '@/types';

const MAX_PET_IMAGES = 6;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const TEMPERAMENT_OPTIONS = ['sociable', 'territorial', 'anxious', 'playful', 'calm', 'independent'] as const;
const MATCH_INTENT_OPTIONS = ['walk', 'play', 'social', 'sit'] as const;
const ACTIVITY_OPTIONS = ['walk', 'play', 'fetch', 'swim', 'socialize', 'groom', 'training'] as const;
const PET_TYPE_OPTIONS = ['dog', 'cat', 'bird', 'other'] as const;
const SIZE_OPTIONS = ['small', 'medium', 'large', 'xlarge'] as const;
const GENDER_OPTIONS = ['male', 'female'] as const;
const ENERGY_OPTIONS = ['low', 'medium', 'high'] as const;
const COMPATIBILITY_OPTIONS = ['yes', 'no', 'unknown'] as const;

type ActivityOption = (typeof ACTIVITY_OPTIONS)[number];

const ACTIVITIES: { id: ActivityOption; label: string; icon: LucideIcon }[] = [
  { id: 'walk', label: 'Pasear', icon: Leaf },
  { id: 'play', label: 'Jugar', icon: Circle },
  { id: 'fetch', label: 'Buscar', icon: Circle },
  { id: 'swim', label: 'Nadar', icon: Waves },
  { id: 'socialize', label: 'Socializar', icon: Users },
  { id: 'groom', label: 'Aseo', icon: Scissors },
  { id: 'training', label: 'Entrenar', icon: GraduationCap },
];

function pickOption<T extends string>(options: readonly T[], value: unknown): T | undefined {
  return typeof value === 'string' && options.includes(value as T) ? (value as T) : undefined;
}

function pickOptions<T extends string>(options: readonly T[], value: unknown): T[] {
  return parseJsonStringArray(value).filter((item): item is T => options.includes(item as T));
}

function checkableClassName(checked: boolean) {
  return cn(
    'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-500/40',
    checked ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-300'
  );
}

interface PetFormProps {
  ownerId: string;
  initialData?: Partial<Pet> | null;
  onSuccess?: (pet: Pet) => void;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function PetForm({ ownerId, initialData, onSuccess, onCancel, onDirtyChange }: PetFormProps) {
  const invalidateViewerData = useInvalidateViewerData();
  const formRef = useRef<HTMLFormElement>(null);
  const initialImages = parseImageUrls(initialData?.images);
  const initialThumbnailIndex = initialData?.thumbnailIndex ?? 0;
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [thumbnailIndex, setThumbnailIndex] = useState<number>(initialThumbnailIndex);
  const isEditing = Boolean(initialData?.id);

  const form = useForm({
    resolver: zodResolver(petSchema),
    shouldFocusError: false,
    defaultValues: {
      name: initialData?.name ?? '',
      petType: pickOption(PET_TYPE_OPTIONS, initialData?.petType) ?? 'dog',
      breed: initialData?.breed ?? '',
      age: initialData && hasPetAge(initialData) ? initialData.age : undefined,
      weight: initialData?.weight ?? undefined,
      size: pickOption(SIZE_OPTIONS, initialData?.size),
      gender: pickOption(GENDER_OPTIONS, initialData?.gender),
      vaccinated: initialData?.vaccinated ?? null,
      neutered: initialData?.neutered ?? null,
      energy: pickOption(ENERGY_OPTIONS, initialData?.energy),
      bio: initialData?.bio ?? '',
      activities: pickOptions(ACTIVITY_OPTIONS, initialData?.activities),
      location: initialData?.location ?? '',
      images: initialImages,
      goodWithKids: pickOption(COMPATIBILITY_OPTIONS, initialData?.goodWithKids) ?? 'unknown',
      goodWithDogs: pickOption(COMPATIBILITY_OPTIONS, initialData?.goodWithDogs) ?? 'unknown',
      goodWithCats: pickOption(COMPATIBILITY_OPTIONS, initialData?.goodWithCats) ?? 'unknown',
      goodWithStrangers: pickOption(COMPATIBILITY_OPTIONS, initialData?.goodWithStrangers) ?? 'unknown',
      temperament: pickOptions(TEMPERAMENT_OPTIONS, initialData?.temperament),
      matchIntent: pickOptions(MATCH_INTENT_OPTIONS, initialData?.matchIntent),
      microchipId: initialData?.microchipId ?? '',
      allergies: initialData?.allergies ?? '',
      specialNeeds: initialData?.specialNeeds ?? '',
      vetClinicName: initialData?.vetClinicName ?? '',
      sharePhoneOnScan: initialData?.sharePhoneOnScan ?? false,
      shareVetOnScan: initialData?.shareVetOnScan ?? false,
    },
  });

  const isDirty = form.formState.isDirty || thumbnailIndex !== initialThumbnailIndex;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const updateImages = (nextImages: string[], nextThumbnailIndex: number) => {
    setImages(nextImages);
    setThumbnailIndex(nextThumbnailIndex);
    form.setValue('images', nextImages, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });
  };

  const removeImage = (index: number) => {
    const nextImages = images.filter((_, i) => i !== index);
    let nextThumbnailIndex = thumbnailIndex;
    if (thumbnailIndex === index) nextThumbnailIndex = 0;
    else if (thumbnailIndex > index) nextThumbnailIndex = thumbnailIndex - 1;
    updateImages(nextImages, Math.min(nextThumbnailIndex, Math.max(0, nextImages.length - 1)));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;

    const remaining = MAX_PET_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`Podés subir hasta ${MAX_PET_IMAGES} fotos.`);
      input.value = '';
      return;
    }
    if (files.length > remaining) {
      toast.info(`Podés subir hasta ${MAX_PET_IMAGES} fotos. Vamos a agregar solo ${remaining}.`);
    }

    const newImages: string[] = [];
    setUploading(true);

    try {
      for (const file of files.slice(0, remaining)) {
        if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
          toast.error(`"${file.name}" no es una imagen compatible. Usá JPG, PNG o WebP.`);
          continue;
        }

        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          toast.error(`"${file.name}" pesa más de 5 MB. Elegí una imagen más liviana.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await response.json().catch(() => null) as { url?: string; error?: string } | null;

        if (!response.ok || !data?.url) {
          toast.error(data?.error || `No pudimos subir "${file.name}". Intentá de nuevo.`);
          continue;
        }

        if (isRenderableImage(data.url)) {
          newImages.push(data.url);
        } else {
          toast.error('La imagen procesada no tiene un formato compatible');
        }
      }

      if (newImages.length > 0) {
        updateImages([...images, ...newImages], images.length);
      }
    } catch {
      toast.error('Error al subir la imagen. Intentá de nuevo.');
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  const onSubmit = async (values: PetFormData) => {
    const imageSelection = normalizePetImageSelection(values.images, thumbnailIndex);
    if (!imageSelection) {
      toast.error('Las fotos de la mascota no tienen un formato compatible');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...values,
        ownerId,
        weight: values.weight ?? null,
        images: JSON.stringify(imageSelection.images),
        thumbnailIndex: imageSelection.thumbnailIndex,
      };

      const response = await fetch(isEditing ? `/api/pet/${initialData?.id}` : '/api/pet/create', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null) as { pet?: Pet; error?: string } | null;

      if (response.ok && data?.pet) {
        toast.success(isEditing ? '¡Mascota actualizada!' : '¡Mascota registrada!');
        onSuccess?.(data.pet);
        invalidateViewerData();
      } else {
        toast.error(data?.error || 'No pudimos guardar la mascota. Intentá de nuevo.');
      }
    } catch {
      toast.error('No pudimos guardar la mascota. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = () => {
    toast.error('Revisá los campos marcados.');
    requestAnimationFrame(() => {
      const target = formRef.current?.querySelector<HTMLElement>(
        '[aria-invalid="true"], [data-invalid="true"] input'
      );
      if (!target) return;
      const scrollTarget = target.closest<HTMLElement>('[data-slot="form-item"]') ?? target;
      scrollTarget.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      target.focus({ preventScroll: true });
    });
  };

  const busy = loading || uploading;
  const gender = form.watch('gender');

  return (
    <Form {...form}>
      <form ref={formRef} onSubmit={form.handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la mascota</FormLabel>
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
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger ref={field.ref}>
                      <SelectValue placeholder="Seleccioná…" />
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
                  <Input placeholder="Golden Retriever, Siamés..." {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Edad (años)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={30}
                    placeholder="Ej: 3"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      field.onChange(Number.isNaN(parsed) ? undefined : parsed);
                    }}
                  />
                </FormControl>
                <p className="text-xs text-slate-500">Si tiene menos de 1 año, poné 0.</p>
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
                    inputMode="decimal"
                    step="0.1"
                    min={0}
                    placeholder="Ej: 5,5"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const parsed = Number.parseFloat(e.target.value);
                      field.onChange(Number.isNaN(parsed) ? undefined : parsed);
                    }}
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
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger ref={field.ref}>
                      <SelectValue placeholder="Seleccioná…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="small">Pequeño</SelectItem>
                    <SelectItem value="medium">Mediano</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                    <SelectItem value="xlarge">Extra grande</SelectItem>
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
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger ref={field.ref}>
                      <SelectValue placeholder="Seleccioná…" />
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
              <FormLabel>Nivel de energía</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger ref={field.ref}>
                    <SelectValue placeholder="Seleccioná…" />
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
          <Label className="font-medium text-slate-700">Estado de salud</Label>
          <div className="flex flex-wrap gap-4">
            <FormField
              control={form.control}
              name="vaccinated"
              render={({ field }) => (
                <label className={checkableClassName(field.value === true)}>
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="sr-only"
                  />
                  <Syringe className={`size-5 ${field.value ? 'text-teal-600' : 'text-slate-400'}`} aria-hidden="true" />
                  <span className={`text-sm font-medium ${field.value ? 'text-teal-700' : 'text-slate-700'}`}>
                    {gender === 'female' ? 'Vacunada' : 'Vacunado'}
                  </span>
                </label>
              )}
            />

            <FormField
              control={form.control}
              name="neutered"
              render={({ field }) => (
                <label className={checkableClassName(field.value === true)}>
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="sr-only"
                  />
                  <Stethoscope className={`size-5 ${field.value ? 'text-teal-600' : 'text-slate-400'}`} aria-hidden="true" />
                  <span className={`text-sm font-medium ${field.value ? 'text-teal-700' : 'text-slate-700'}`}>
                    {gender === 'female' ? 'Castrada' : 'Castrado'}
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
                <Input placeholder="Ciudad, País" {...field} value={field.value ?? ''} />
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
              <FormLabel>Biografía de la mascota</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Contanos sobre tu mascota..."
                  className="resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="activities"
          render={({ field, fieldState }) => {
            const selected = field.value ?? [];
            return (
              <FormItem data-invalid={fieldState.invalid || undefined}>
                <fieldset className="space-y-3">
                  <legend className={cn('font-medium text-slate-700', fieldState.invalid && 'text-destructive')}>
                    Actividades favoritas
                  </legend>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {ACTIVITIES.map((activity) => {
                      const ActivityIcon = activity.icon;
                      const checked = selected.includes(activity.id);
                      return (
                        <label
                          key={activity.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-500/40',
                            checked
                              ? 'border-teal-300 bg-teal-50 text-teal-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          )}
                        >
                          <input
                            type="checkbox"
                            value={activity.id}
                            checked={checked}
                            onChange={(e) => field.onChange(
                              e.target.checked
                                ? [...selected, activity.id]
                                : selected.filter((item) => item !== activity.id)
                            )}
                            onBlur={field.onBlur}
                            className="sr-only"
                          />
                          <ActivityIcon className="size-5 text-teal-700" aria-hidden="true" />
                          <span className="text-sm font-medium">{activity.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <p className="text-xs text-slate-500">Seleccioná al menos una actividad</p>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className="space-y-3">
          <Label className="font-medium text-slate-700">Pasaporte y compatibilidad</Label>
          <CompatibilityFields
            data={{
              goodWithKids: form.watch('goodWithKids'),
              goodWithDogs: form.watch('goodWithDogs'),
              goodWithCats: form.watch('goodWithCats'),
              goodWithStrangers: form.watch('goodWithStrangers'),
              temperament: form.watch('temperament'),
              matchIntent: form.watch('matchIntent'),
            }}
            onChange={(field, value) => form.setValue(field as 'goodWithKids', value as never, { shouldDirty: true })}
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
                  <Input placeholder="Opcional" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
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
                  <Input placeholder="Clínica de cabecera" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
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
                  <Input placeholder="Si las hay" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
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
                  <Input placeholder="Cuidados extra" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <Label className="font-medium text-slate-700">Privacidad al escanear QR</Label>
          <p className="text-xs text-slate-500">Controlá qué datos se muestran en el pasaporte público</p>
          <div className="flex flex-col gap-3">
            <FormField
              control={form.control}
              name="sharePhoneOnScan"
              render={({ field }) => (
                <label className={checkableClassName(Boolean(field.value))}>
                  <input
                    type="checkbox"
                    checked={Boolean(field.value)}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="sr-only"
                  />
                  <Phone className="size-5 text-teal-600" aria-hidden="true" />
                  <div>
                    <span className={`block text-sm font-medium ${field.value ? 'text-teal-700' : 'text-slate-700'}`}>
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
                <label className={checkableClassName(Boolean(field.value))}>
                  <input
                    type="checkbox"
                    checked={Boolean(field.value)}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="sr-only"
                  />
                  <Hospital className="size-5 text-teal-600" aria-hidden="true" />
                  <div>
                    <span className={`block text-sm font-medium ${field.value ? 'text-teal-700' : 'text-slate-700'}`}>
                      Compartir veterinaria
                    </span>
                    <span className="text-xs text-slate-500">Mostrar la clínica de cabecera al escanear</span>
                  </div>
                </label>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="images"
          render={({ fieldState }) => (
            <FormItem data-invalid={fieldState.invalid || undefined} className="gap-0">
              <Label className={cn(fieldState.invalid && 'text-destructive')}>
                Fotos ({images.length}/{MAX_PET_IMAGES})
              </Label>
              <p className="mb-2 text-xs text-slate-500">
                Elegí una estrella para definir la foto principal. Los cambios en las fotos se guardan al tocar{' '}
                {isEditing ? '“Actualizar mascota”' : '“Guardar mascota”'}.
              </p>
              <div className="mt-2 grid grid-cols-3 gap-4">
                {images.map((image, index) => {
                  const isThumbnail = thumbnailIndex === index;
                  const photoNumber = index + 1;

                  return (
                    <div
                      key={`${index}-${image.slice(-16)}`}
                      className={cn(
                        'relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-teal-100',
                        isThumbnail && 'ring-4 ring-teal-500'
                      )}
                    >
                      {isRenderableImage(image) ? (
                        <Image
                          src={image}
                          alt={`Foto ${photoNumber}`}
                          fill
                          sizes="(max-width: 640px) 30vw, 180px"
                          unoptimized={shouldUnoptimizeImage(image)}
                          className="object-cover"
                        />
                      ) : (
                        <ImageOff className="size-10 text-teal-700" aria-hidden="true" />
                      )}
                      <Button
                        type="button"
                        variant={isThumbnail ? 'default' : 'outline'}
                        size="icon"
                        className={cn(
                          'absolute left-2 top-2 size-8 gap-0 rounded-lg p-0',
                          isThumbnail ? 'bg-primary hover:bg-primary-hover' : 'bg-white/80 hover:bg-primary-soft'
                        )}
                        onClick={() => setThumbnailIndex(index)}
                        disabled={busy}
                        title={isThumbnail ? 'Foto principal' : 'Usar como foto principal'}
                        aria-label={isThumbnail ? `Foto ${photoNumber} es la foto principal` : `Usar foto ${photoNumber} como foto principal`}
                        aria-pressed={isThumbnail}
                      >
                        <Star
                          className={`size-4 ${isThumbnail ? 'text-white' : 'text-slate-500'}`}
                          fill={isThumbnail ? 'currentColor' : undefined}
                          aria-hidden="true"
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute right-2 top-2 size-8 gap-0 rounded-lg p-0"
                        onClick={() => removeImage(index)}
                        disabled={busy}
                        title="Quitar foto"
                        aria-label={`Quitar foto ${photoNumber}`}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                      {isThumbnail && (
                        <div className="absolute bottom-0 left-0 right-0 bg-teal-500 py-1 text-center text-xs font-medium text-white">
                          Foto principal
                        </div>
                      )}
                    </div>
                  );
                })}

                {images.length < MAX_PET_IMAGES && (
                  <label
                    htmlFor="image-upload"
                    className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-teal-300 bg-teal-50 text-center has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-500/40"
                  >
                    {uploading ? (
                      <LoaderCircle className="size-6 animate-spin text-teal-500" aria-hidden="true" />
                    ) : (
                      <>
                        <Upload className="mb-2 size-8 text-teal-500" aria-hidden="true" />
                        <span className="text-sm text-slate-600">Subir foto</span>
                      </>
                    )}
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      multiple
                      className="sr-only"
                      disabled={busy}
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Máximo {MAX_PET_IMAGES} fotos. Formatos: JPG, PNG o WebP. Hasta 5 MB por foto.
              </p>
              <FormMessage className="mt-2" />
            </FormItem>
          )}
        />

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" className="w-full flex-1" disabled={busy}>
            {loading ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
                {isEditing ? 'Actualizando...' : 'Guardando...'}
              </>
            ) : (
              isEditing ? 'Actualizar mascota' : 'Guardar mascota'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
