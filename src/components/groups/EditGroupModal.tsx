'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface EditGroupModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    group: {
        id: string;
        name: string;
        description: string;
        image: string | null;
    };
}

export default function EditGroupModal({ open, onOpenChange, onSuccess, group }: EditGroupModalProps) {
    const [name, setName] = useState(group.name);
    const [description, setDescription] = useState(group.description);
    const [image, setImage] = useState(group.image || '');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (open) {
            setName(group.name);
            setDescription(group.description);
            setImage(group.image || '');
        }
    }, [open, group]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen debe ser menor a 5MB');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Error al subir');

            const data = await res.json();
            if (data.url) {
                setImage(data.url);
                toast.success('Imagen subida correctamente');
            } else {
                toast.error('Error al subir imagen');
            }
        } catch (error) {
            toast.error('Error al subir imagen');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`/api/groups/${group.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, image }),
            });

            const data = await res.json();

            if (data.success) {
                toast.success('Grupo actualizado exitosamente');
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error(data.error || 'Error al actualizar grupo');
            }
        } catch (error) {
            toast.error('Error al actualizar grupo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Grupo</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Nombre del Grupo</Label>
                        <Input
                            id="edit-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-description">Descripción</Label>
                        <Textarea
                            id="edit-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-image">Imagen de Portada</Label>
                        <div className="flex gap-4 items-start">
                            {image && (
                                <div className="w-16 h-16 rounded-md bg-slate-100 overflow-hidden shrink-0">
                                    <img src={image} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="flex-1">
                                <label
                                    htmlFor="edit-image-upload"
                                    className={`flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span className="material-symbols-rounded text-slate-400">upload_file</span>
                                    <span className="text-sm text-slate-600">
                                        {image ? 'Cambiar imagen' : 'Subir imagen de portada'}
                                    </span>
                                    <input
                                        id="edit-image-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                    />
                                </label>
                                {uploading && <p className="text-xs text-teal-600 mt-1 animate-pulse text-center">Subiendo...</p>}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-teal-500 hover:bg-teal-600" disabled={loading || uploading}>
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
