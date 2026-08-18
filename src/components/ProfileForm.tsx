'use client';

import Image from 'next/image';
import { useState } from 'react';
import { LoaderCircle, Upload, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
const profileSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  bio: z.string().min(10, 'La bio debe tener al menos 10 caracteres').max(500, 'Máximo 500 caracteres'),
  age: z.number().min(18, 'Debes tener al menos 18 años').max(100, 'Edad no válida'),
  gender: z.enum(['male', 'female'], 'Seleccioná tu género'),
  location: z.string().min(2, 'La ubicación es requerida'),
  interests: z.string().min(1, 'Agregá al menos un interés'),
});

interface ProfileFormProps {
  userId: string;
  initialData?: any;
  onSuccess?: () => void;
}

export default function ProfileForm({ userId, initialData, onSuccess }: ProfileFormProps) {
  const [loading, setLoading] = useState(false);

  const parseImages = (imagesJson?: string): string[] => {
    if (!imagesJson) return [];
    try {
      const parsed = JSON.parse(imagesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const [images, setImages] = useState<string[]>(() => parseImages(initialData?.images));
  const [uploading, setUploading] = useState(false);
  
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initialData?.name || '',
      bio: initialData?.bio || '',
      age: initialData?.age || 18,
      gender: initialData?.gender || 'male',
      location: initialData?.location || '',
      interests: initialData?.interests || '',
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
        alert('La imagen debe ser menor a 5MB');
        continue;
      }

      if (!file.type.startsWith('image/')) {
        alert('Solo se permiten imágenes');
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
          alert(`Error al subir imagen: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        if (data.url) {
          newImages.push(data.url);
        } else if (data.error) {
          alert(data.error);
        }
      } catch (error) {
        alert('Error al subir imagen. Inténtalo de nuevo.');
      }
    }

    setImages([...images, ...newImages]);
    setUploading(false);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (images.length === 0) {
      alert('Debes subir al menos una imagen');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/profile/user', {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          userId,
          images: JSON.stringify(images),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess?.();
      } else {
        alert(data.error || 'Error al guardar perfil');
      }
    } catch (error) {
      alert('Error al guardar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Tu nombre" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="age"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Edad</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Tu edad" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
              </FormControl>
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
                    <SelectValue placeholder="Seleccioná tu género" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Femenino</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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
              <FormLabel>Biografía</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Contanos sobre vos..."
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
          name="interests"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Intereses</FormLabel>
              <FormControl>
                <Input
                  placeholder="viajes, música, deportes (separados por comas)"
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-slate-500">
                Escribe tus intereses separados por comas
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Label>Imágenes ({images.length}/6)</Label>
          <div className="mt-2 grid grid-cols-3 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                <Image src={image} alt={`Foto ${index + 1}`} fill className="object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 size-7 gap-0 rounded-md p-0"
                  onClick={() => removeImage(index)}
                  aria-label="Eliminar foto"
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}

            {images.length < 6 && (
              <div className="aspect-square rounded-lg border-2 border-dashed border-teal-300 flex items-center justify-center bg-teal-50">
                <label htmlFor="image-upload" className="cursor-pointer text-center w-full h-full flex flex-col items-center justify-center">
                  {uploading ? (
                    <LoaderCircle className="mb-0 size-6 animate-spin text-teal-600" aria-hidden="true" />
                  ) : (
                    <>
                      <Upload className="mb-2 size-8 text-teal-600" aria-hidden="true" />
                      <p className="text-sm text-slate-600">Subir foto</p>
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
          <p className="text-xs text-slate-500 mt-2">
            Máximo 6 imágenes. Formatos: JPG, PNG. Máximo 5MB por imagen.
          </p>
        </div>

        <Button type="submit" className="w-full bg-teal-700 hover:bg-teal-800" disabled={loading || uploading}>
          {loading ? (
            <>
              <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
              Guardando...
            </>
          ) : (
            'Guardar perfil'
          )}
        </Button>
      </form>
    </Form>
  );
}
