'use client';

import { useState } from 'react';
import { Camera, LoaderCircle, X } from 'lucide-react';
import { toast } from 'sonner';

interface StepPhotosProps {
    images: string[];
    setImages: (images: string[]) => void;
}

const MAX_PHOTOS = 6;

export default function StepPhotos({ images, setImages }: StepPhotosProps) {
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || images.length >= MAX_PHOTOS) return;

        setUploading(true);
        const newImages: string[] = [];

        for (let i = 0; i < files.length && images.length + newImages.length < MAX_PHOTOS; i++) {
            const file = files[i];
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Imagen muy pesada (>5MB)');
                continue;
            }

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) newImages.push(data.url);
            } catch (e) {
                console.error('Upload failed');
            }
        }

        setImages([...images, ...newImages]);
        setUploading(false);
        e.target.value = '';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Fotos</h2>
                <p className="text-sm text-slate-500">¡Muestra lo adorable que es! ({images.length}/{MAX_PHOTOS})</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden shadow-sm">
                        <img src={img} alt="Pet" className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={() => setImages(images.filter((_, i) => i !== idx))}
                            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-red-500 text-white shadow-sm"
                            aria-label="Eliminar foto"
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                ))}

                {images.length < MAX_PHOTOS && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-teal-300 flex flex-col items-center justify-center cursor-pointer hover:bg-teal-50 transition-colors bg-teal-50/50">
                        {uploading ? (
                            <LoaderCircle className="size-6 animate-spin text-teal-500" aria-hidden="true" />
                        ) : (
                            <>
                                <Camera className="text-teal-500 size-8 mb-2" aria-hidden="true" />
                                <span className="text-xs text-slate-500">Subir Foto</span>
                            </>
                        )}
                        <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                    </label>
                )}
            </div>
        </div>
    );
}
