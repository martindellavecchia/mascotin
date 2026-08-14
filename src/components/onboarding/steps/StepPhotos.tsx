'use client';

import { useState } from 'react';
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
                <h2 className="text-xl font-bold text-gray-800">Fotos</h2>
                <p className="text-sm text-gray-500">¡Muestra lo adorable que es! ({images.length}/{MAX_PHOTOS})</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden shadow-sm">
                        <img src={img} alt="Pet" className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={() => setImages(images.filter((_, i) => i !== idx))}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-sm"
                            aria-label="Eliminar foto"
                        >
                            <span className="material-symbols-rounded text-sm block">close</span>
                        </button>
                    </div>
                ))}

                {images.length < MAX_PHOTOS && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                        {uploading ? (
                            <span className="material-symbols-rounded animate-spin text-teal-500">hourglass_empty</span>
                        ) : (
                            <>
                                <span className="material-symbols-rounded text-gray-400 text-3xl mb-2">add_a_photo</span>
                                <span className="text-xs text-gray-500">Subir Foto</span>
                            </>
                        )}
                        <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                    </label>
                )}
            </div>
        </div>
    );
}
