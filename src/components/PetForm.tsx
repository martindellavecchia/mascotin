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
import { ImageUploadSection } from './ImageUploadSection';

interface PetFormProps {
  ownerId: string;
  initialData?: any;
  onSuccess?: (pet: any) => void;
  onCancel?: () => void;
}

const ACTIVITY_OPTIONS = ['walk', 'play', 'fetch', 'swim', 'socialize', 'groom', 'training'] as const;
type ActivityOption = (typeof ACTIVITY_OPTIONS)[number];

function isActivityOption(value: unknown): value is ActivityOption {
  return typeof value === 'string' && ACTIVITY_OPTIONS.includes(value as ActivityOption);
}
function parseImages(imagesJson: string | undefined): string[] {
  if (!imagesJson) return [];
  try {
    const parsed = JSON.parse(imagesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
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

export default function PetForm({ ownerId, initialData, onSuccess, onCancel }: PetFormProps) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>(parseImages(initialData?.images));
  const [uploading, setUploading] = useState(false);
  const [thumbnailIndex, setThumbnailIndex] = useState<number>(initialData?.thumbnailIndex ?? 0);

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
      images: parseImages(initialData?.images),
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || images.length >= 6) return;

    const newImages: string[] = [];
    setUploading(true);

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

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          toast.error(`Error al subir imagen: ${response.status}`);
          continue;
        }

        const data = await response.json();
        if (data.url) {
          newImages.push(data.url);
          // Sincronizar con el formulario
          form.setValue('images', [...images, ...newImages]);
        } else if (data.error) {
          toast.error(data.error);
        }
      } catch (error) {
        toast.error('Error al subir imagen. Inténtalo de nuevo.');
      }
    }

    setImages([...images, ...newImages]);
    setUploading(false);
  };

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    // Sincronizar con el formulario
    form.setValue('images', updatedImages);
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

    setLoading(true);

    try {
      const isEditing = !!initialData?.id;
      const payload = {
        ...values,
        ownerId,
        images: JSON.stringify(finalImages),
        thumbnailIndex,
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
                    <SelectItem value="dog">🐕 Perro</SelectItem>
                    <SelectItem value="cat">🐱 Gato</SelectItem>
                    <SelectItem value="bird">🐦 Pájaro</SelectItem>
                    <SelectItem value="other">🐾 Otro</SelectItem>
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

        <div className="grid grid-cols-4 gap-4">
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
                <FormLabel>Género</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Género" />
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
          <Label className="text-gray-700 font-medium">Estado de Salud</Label>
          <div className="flex flex-wrap gap-4">
            <FormField
              control={form.control}
              name="vaccinated"
              render={({ field }) => (
                <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${field.value
                  ? 'bg-teal-50 border-emerald-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="w-5 h-5 rounded border-gray-300 accent-teal-500"
                  />
                  <span className="text-lg">✅</span>
                  <span className={`text-sm font-medium ${field.value ? 'text-teal-700' : 'text-gray-700'}`}>Vacunado</span>
                </label>
              )}
            />

            <FormField
              control={form.control}
              name="neutered"
              render={({ field }) => (
                <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${field.value
                  ? 'bg-teal-50 border-emerald-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="w-5 h-5 rounded border-gray-300 accent-teal-500"
                  />
                  <span className="text-lg">⚖️</span>
                  <span className={`text-sm font-medium ${field.value ? 'text-teal-700' : 'text-gray-700'}`}>Castrado</span>
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
          <Label className="text-gray-700 font-medium">Actividades Favoritas</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: 'walk', label: 'Pasear', emoji: '🚶' },
              { id: 'play', label: 'Jugar', emoji: '🎾' },
              { id: 'fetch', label: 'Buscar', emoji: '🦴' },
              { id: 'swim', label: 'Nadar', emoji: '🏊' },
              { id: 'socialize', label: 'Socializar', emoji: '🐕' },
              { id: 'groom', label: 'Aseo', emoji: '✨' },
              { id: 'training', label: 'Entrenar', emoji: '🎓' }
            ].map((activity) => (
              <label
                key={activity.id}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${form.watch('activities')?.includes(activity.id as ActivityOption)
                  ? 'bg-teal-50 border-emerald-300 text-teal-700'
                  : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
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
                  className="w-4 h-4 rounded border-gray-300 accent-teal-500"
                />
                <span className="text-lg">{activity.emoji}</span>
                <span className="text-sm font-medium">{activity.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Selecciona al menos una actividad</p>
        </div>

        <div>
          <Label>Imágenes ({images.length}/6)</Label>
          <p className="text-xs text-gray-500 mb-2">Haz clic en ⭐ para seleccionar la foto de perfil</p>
          <div className="mt-2 grid grid-cols-3 gap-4">
            {images.map((image, index) => (
              <div
                key={index}
                className={`relative aspect-square rounded-lg overflow-hidden bg-teal-100 ${thumbnailIndex === index ? 'ring-4 ring-yellow-400' : ''}`}
              >
                <Image src={image} alt={`Foto ${index + 1}`} fill className="object-cover" />
                {/* Thumbnail selector */}
                <Button
                  type="button"
                  variant={thumbnailIndex === index ? "default" : "outline"}
                  size="icon"
                  className={`absolute top-2 left-2 h-7 w-7 ${thumbnailIndex === index ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-white/80 hover:bg-yellow-100'}`}
                  onClick={() => setThumbnailIndex(index)}
                  title="Usar como foto de perfil"
                >
                  <span className={`material-symbols-rounded h-4 w-4 ${thumbnailIndex === index ? 'text-white fill-white' : 'text-gray-500'}`}>star</span>
                </Button>
                {/* Delete button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => {
                    const newImages = images.filter((_, i) => i !== index);
                    setImages(newImages);
                    form.setValue('images', newImages);
                    // Adjust thumbnail index if needed
                    if (thumbnailIndex >= newImages.length) {
                      setThumbnailIndex(Math.max(0, newImages.length - 1));
                    } else if (thumbnailIndex > index) {
                      setThumbnailIndex(thumbnailIndex - 1);
                    }
                  }}
                >
                  <span className="material-symbols-rounded h-3 w-3">close</span>
                </Button>
                {thumbnailIndex === index && (
                  <div className="absolute bottom-0 left-0 right-0 bg-yellow-400 text-white text-xs text-center py-1 font-medium">
                    Foto de perfil
                  </div>
                )}
              </div>
            ))}

            {images.length < 6 && (
              <div className="aspect-square rounded-lg border-2 border-dashed border-green-300 flex items-center justify-center bg-teal-50">
                <label htmlFor="image-upload" className="cursor-pointer text-center w-full h-full flex items-center justify-center">
                  {uploading ? (
                    <span className="material-symbols-rounded w-8 h-8 text-teal-500 animate-spin">pending</span>
                  ) : (
                    <>
                      <span className="material-symbols-rounded w-8 h-8 mx-auto mb-2 text-teal-500">upload</span>
                      <p className="text-sm text-gray-600">Subir foto</p>
                    </>
                  )}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Máximo 6 imágenes. Formatos: JPG, PNG. Máximo 5MB por imagen.
          </p>
        </div>

        <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-lg" disabled={loading || uploading}>
          {loading ? (
            <>
              <span className="material-symbols-rounded w-4 h-4 mr-2 animate-spin">pending</span>
              {initialData?.id ? 'Actualizando...' : 'Guardando...'}
            </>
          ) : (
            initialData?.id ? 'Actualizar Mascota' : 'Guardar Mascota'
          )}
        </Button>
      </form>
    </Form>
  );
}


