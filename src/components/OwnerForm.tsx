'use client';

import { useState, useRef } from 'react';
import { Camera, ChevronDown, Hourglass, PawPrint, Trees } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ownerSchema, type OwnerFormData } from '@/lib/schemas';
import type { Owner } from '@/types';
import { toast } from 'sonner';

interface OwnerFormProps {
  userId: string;
  initialData?: Partial<Owner>;
  defaultName?: string;
  onSuccess?: (owner: Owner) => void;
  onCancel?: () => void;
}

export default function OwnerForm({ userId, initialData, defaultName, onSuccess, onCancel }: OwnerFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string>(initialData?.image || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    resolver: zodResolver(ownerSchema),
    defaultValues: {
      name: initialData?.name || defaultName || '',
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

  const onSubmit = async (values: OwnerFormData) => {
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
        if (errors.phone || errors.bio) {
          setDetailsOpen(true);
          const firstInvalidField = errors.name ? 'name' : errors.location ? 'location' : errors.phone ? 'phone' : 'bio';
          requestAnimationFrame(() => form.setFocus(firstInvalidField));
        }
      })} className="space-y-5">
        <div className="flex items-center gap-3">
            <Avatar className="size-14 shrink-0 border border-border">
              {profileImage ? (
                <AvatarImage src={profileImage} alt="Tu foto de perfil" className="object-cover" />
              ) : (
                <AvatarFallback className="bg-primary-soft text-xl text-primary">
                  {form.watch('name')?.[0] || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
          <div className="min-w-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2 px-2"
              aria-label="Cambiar foto de perfil"
            >
              {uploading ? (
                <Hourglass className="size-4" aria-hidden="true" />
              ) : (
                <Camera className="size-4" aria-hidden="true" />
              )}
              {uploading ? 'Subiendo foto…' : 'Cambiar foto'}
            </Button>
            <p className="px-2 text-xs text-muted-foreground">Opcional · hasta 5 MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Tu nombre" {...field} />
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
                <Input autoComplete="address-level2" placeholder="Ciudad, País" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <details open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)} className="group rounded-lg border border-border">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block text-sm font-semibold text-foreground">Más sobre vos</span>
              <span className="block text-xs text-muted-foreground">Teléfono, biografía y tu hogar · opcional</span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="space-y-5 border-t border-border p-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono (opcional)</FormLabel>
                  <FormControl>
                    <Input type="tel" autoComplete="tel" placeholder="+54 9 11 1234 5678" {...field} value={field.value || ''} />
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
                      placeholder="Contanos sobre vos y tus mascotas..."
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
              <Label className="text-gray-700 font-medium">Información adicional</Label>
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
                      <Trees className="size-5 text-teal-700" aria-hidden="true" />
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
                      <PawPrint className="size-5 text-teal-700" aria-hidden="true" />
                      <span className={`text-sm font-medium ${field.value ? 'text-teal-700' : 'text-gray-700'}`}>Tengo otras mascotas</span>
                    </label>
                  )}
                />
              </div>
            </div>

          </div>
        </details>

        <div className="flex gap-3">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
          <Button type="submit" className="flex-1" disabled={loading || uploading}>
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Guardando...
              </>
            ) : (
              'Guardar perfil'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
