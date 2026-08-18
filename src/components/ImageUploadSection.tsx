import Image from 'next/image';
import { LoaderCircle, Star, Upload, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ImageUploadSectionProps {
  images: string[];
  setImages: (images: string[]) => void;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
  thumbnailIndex: number;
  setThumbnailIndex: (index: number) => void;
  form: any;
}

export function ImageUploadSection({
  images,
  setImages,
  uploading,
  setUploading,
  thumbnailIndex,
  setThumbnailIndex,
  form,
}: ImageUploadSectionProps) {
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
          toast.error(`Error al subir imagen: ${response.status}`);
          continue;
        }

        const data = await response.json();
        if (data.url) {
          newImages.push(data.url);
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
    form.setValue('images', updatedImages);
    if (thumbnailIndex >= updatedImages.length) {
      setThumbnailIndex(Math.max(0, updatedImages.length - 1));
    } else if (thumbnailIndex > index) {
      setThumbnailIndex(thumbnailIndex - 1);
    }
  };

  return (
    <div>
      <Label>Imágenes ({images.length}/6)</Label>
      <p className="text-xs text-slate-500 mb-2">Hacé clic en la estrella para elegir la foto de perfil</p>
      <div className="mt-2 grid grid-cols-3 gap-4">
        {images.map((image, index) => (
          <div
            key={index}
            className={`relative aspect-square rounded-lg overflow-hidden bg-teal-100 ${thumbnailIndex === index ? 'ring-4 ring-teal-500' : ''}`}
          >
            <Image src={image} alt={`Foto ${index + 1}`} fill className="object-cover" />
            <Button
              type="button"
              variant={thumbnailIndex === index ? "default" : "outline"}
              size="icon"
              className={`absolute top-2 left-2 size-7 gap-0 rounded-full p-0 ${thumbnailIndex === index ? 'bg-teal-500 hover:bg-teal-600' : 'bg-white/80 hover:bg-teal-50'}`}
              onClick={() => setThumbnailIndex(index)}
              title="Usar como foto de perfil"
              aria-label="Usar como foto de perfil"
            >
              <Star
                className={`size-4 ${thumbnailIndex === index ? 'text-white' : 'text-slate-500'}`}
                fill={thumbnailIndex === index ? 'currentColor' : undefined}
                aria-hidden="true"
              />
            </Button>
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
            {thumbnailIndex === index && (
              <div className="absolute bottom-0 left-0 right-0 bg-teal-500 text-white text-xs text-center py-1 font-medium">
                Foto de perfil
              </div>
            )}
          </div>
        ))}

        {images.length < 6 && (
          <div className="aspect-square rounded-lg border-2 border-dashed border-teal-300 flex items-center justify-center bg-teal-50">
            <label htmlFor="image-upload" className="cursor-pointer text-center w-full h-full flex flex-col items-center justify-center">
              {uploading ? (
                <LoaderCircle className="size-6 animate-spin text-teal-500" aria-hidden="true" />
              ) : (
                <>
                  <Upload className="mb-2 size-8 text-teal-500" aria-hidden="true" />
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
  );
}
