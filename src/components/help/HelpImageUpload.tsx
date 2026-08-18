'use client';

import Image from 'next/image';
import { useId, useState } from 'react';
import { ImagePlus, LoaderCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { shouldUnoptimizeImage } from '@/lib/media';
import { toast } from 'sonner';

interface HelpImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
}
export default function HelpImageUpload({ images, onChange }: HelpImageUploadProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Seleccioná una imagen válida');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe pesar menos de 5 MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok || !data.url) {
        toast.error(data.error || 'No se pudo subir la imagen');
        return;
      }
      onChange([...images, data.url].slice(0, 3));
    } catch {
      toast.error('No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Fotos del animal ({images.length}/3)</Label>
      <div className="grid grid-cols-3 gap-2">
        {images.map((source, index) => (
          <div key={`${source.slice(0, 32)}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
            <Image
              src={source}
              alt={`Foto del animal ${index + 1}`}
              fill
              sizes="(max-width: 640px) 30vw, 160px"
              unoptimized={shouldUnoptimizeImage(source)}
              className="object-cover"
            />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute right-1.5 top-1.5 size-8 rounded-md"
              onClick={() => onChange(images.filter((_, imageIndex) => imageIndex !== index))}
              aria-label={`Eliminar foto ${index + 1}`}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
        {images.length < 3 && (
          <label
            htmlFor={inputId}
            className="flex aspect-square min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-teal-200 bg-teal-50 text-center text-teal-700 transition-colors hover:border-teal-400"
          >
            {uploading ? (
              <LoaderCircle className="size-8 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="size-8" aria-hidden="true" />
            )}
            <span className="mt-1 px-2 text-xs font-medium">{uploading ? 'Subiendo…' : 'Agregar foto'}</span>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = '';
              }}
            />
          </label>
        )}
      </div>
      <p className="text-xs text-slate-500">La primera foto será la portada del caso.</p>
    </div>
  );
}
