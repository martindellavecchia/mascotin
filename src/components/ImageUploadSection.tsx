import Image from 'next/image';
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
          const errorText = await response.text();
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
      <p className="text-xs text-gray-500 mb-2">Haz clic en ⭐ para seleccionar la foto de perfil</p>
      <div className="mt-2 grid grid-cols-3 gap-4">
        {images.map((image, index) => (
          <div
            key={index}
            className={`relative aspect-square rounded-lg overflow-hidden bg-teal-100 ${thumbnailIndex === index ? 'ring-4 ring-yellow-400' : ''}`}
          >
            <Image src={image} alt={`Foto ${index + 1}`} fill className="object-cover" />
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
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => removeImage(index)}
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
  );
}
