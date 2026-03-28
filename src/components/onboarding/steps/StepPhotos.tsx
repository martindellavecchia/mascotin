'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface StepPhotosProps {
    images: string[];
    setImages: (images: string[]) => void;
}

export default function StepPhotos({ images, setImages }: StepPhotosProps) {
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        setUploading(true);
        const newImages: string[] = [];

        for (let i = 0; i < files.length; i++) {
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
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Fotos</h2>
                <p className="text-sm text-gray-500">¡Muestra lo adorable que es!</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden shadow-sm group">
                        <img src={img} alt="Pet" className="w-full h-full object-cover" />
                        <button
                            onClick={() => setImages(images.filter((_, i) => i !== idx))}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <span className="material-symbols-rounded text-sm block">close</span>
                        </button>
                    </div>
                ))}

                {images.length < 4 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                        {uploading ? (
                            <span className="material-symbols-rounded animate-spin text-teal-500">hourglass_empty</span>
                        ) : (
                            <>
                                <span className="material-symbols-rounded text-gray-400 text-3xl mb-2">add_a_photo</span>
                                <span className="text-xs text-gray-500">Subir Foto</span>
                            </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                )}
            </div>
        </div>
    );
}
