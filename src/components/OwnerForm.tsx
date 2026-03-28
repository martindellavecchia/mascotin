'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ownerSchema } from '@/lib/schemas';
import { toast } from 'sonner';

interface OwnerFormProps {
  userId: string;
  initialData?: any;
  onSuccess?: (owner: any) => void;
  onCancel?: () => void;
}

export default function OwnerForm({ userId, initialData, onSuccess, onCancel }: OwnerFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<string>(initialData?.image || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    resolver: zodResolver(ownerSchema),
    defaultValues: {
      name: initialData?.name || '',
      phone: initialData?.phone || '',
      location: initialData?.location || '',
      bio: initialData?.bio || '',
      image: initialData?.image || '',
      hasYard: initialData?.hasYard ?? false,
      hasOtherPets: initialData?.hasOtherPets ?? false,
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.url) {
        setProfileImage(data.url);
        form.setValue('image', data.url);
        toast.success('Imagen subida correctamente');
      } else {
        toast.error(data.error || 'Error al subir imagen');
      }
    } catch (error) {
      toast.error('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: any) => {
    setLoading(true);

    try {
      const response = await fetch('/api/owner/profile', {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          image: profileImage,
          userId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Perfil guardado correctamente');
        if (onSuccess) onSuccess(data.owner);
      } else {
        toast.error(data.error || 'Error al guardar perfil de dueño');
      }
    } catch (error) {
      toast.error('Error al guardar perfil de dueño');
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = (errors: any) => {
    console.error('Form validation errors:', errors);
    const errorMessages = Object.entries(errors).map(([key, err]: [string, any]) =>
      `${key}: ${err?.message || 'Error'}`
    );
    if (errorMessages.length > 0) {
      toast.error('Errores: ' + errorMessages.join(', '));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        {/* Profile Photo */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-teal-100">
              {profileImage ? (
                <AvatarImage src={profileImage} className="object-cover" />
              ) : (
                <AvatarFallback className="bg-teal-100 text-teal-700 text-2xl">
                  {form.watch('name')?.[0] || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-2 bg-teal-500 text-white rounded-full shadow-md hover:bg-teal-600 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-rounded text-sm">
                {uploading ? 'hourglass_empty' : 'photo_camera'}
              </span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <p className="text-sm text-slate-500">Foto de perfil (opcional)</p>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl>
                <Input placeholder="Tu nombre" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono (opcional)</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+54 9 11 1234 5678" {...field} value={field.value || ''} />
              </FormControl>
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
              <FormLabel>Biografía (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Cuéntanos sobre ti como dueño de mascota..."
                  className="resize-none"
                  rows={3}
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <p className="text-xs text-gray-500">Máximo 500 caracteres</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <Label className="text-gray-700 font-medium">Información Adicional</Label>
          <div className="flex flex-wrap gap-4">
            <FormField
              control={form.control}
              name="hasYard"
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
                  <span className="text-lg">🏡</span>
                  <span className={`text-sm font-medium ${field.value ? 'text-teal-700' : 'text-gray-700'}`}>Tengo patio/jardín</span>
                </label>
              )}
            />

            <FormField
              control={form.control}
              name="hasOtherPets"
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
                  <span className="text-lg">🐾</span>
                  <span className={`text-sm font-medium ${field.value ? 'text-teal-700' : 'text-gray-700'}`}>Tengo otras mascotas</span>
                </label>
              )}
            />
          </div>
        </div>

        <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-lg" disabled={loading}>
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Guardando...
            </>
          ) : (
            'Guardar Perfil de Dueño'
          )}
        </Button>
      </form>
    </Form>
  );
}
