'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useFetchWithError } from '@/hooks/useFetchWithError';

interface Pet {
    id: string;
    name: string;
    petType: string;
    images: string;
}

interface LostPetFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export default function LostPetForm({ open, onOpenChange, onSuccess }: LostPetFormProps) {
    const { data: session } = useSession();
    const [pets, setPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingPets, setLoadingPets] = useState(true);
    const { fetchWithError } = useFetchWithError();

    const [selectedPetId, setSelectedPetId] = useState('');
    const [description, setDescription] = useState('');
    const [lastSeenLocation, setLastSeenLocation] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    useEffect(() => {
        if (open && session) {
            fetchPets();
        }
    }, [open, session]);

    const fetchPets = async () => {
        const result = await fetchWithError<{ pets: Pet[] }>('/api/owner/pets');
        if (result.success && result.data) {
            setPets(result.data.pets);
        }
        setLoadingPets(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!description || !lastSeenLocation || !contactPhone) {
            toast.error('Por favor completa todos los campos requeridos');
            return;
        }

        setLoading(true);
        try {
            // Get pet image if pet selected
            let images = '[]';
            if (imageUrl) {
                images = JSON.stringify([imageUrl]);
            } else if (selectedPetId) {
                const pet = pets.find(p => p.id === selectedPetId);
                if (pet?.images) {
                    images = pet.images;
                }
            }

            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postType: 'lost_pet',
                    content: description,
                    images,
                    petId: selectedPetId || null,
                    lastSeenLocation,
                    contactPhone,
                    location: lastSeenLocation,
                }),
            });

            const data = await res.json();
            if (data.success || data.post) {
                toast.success('🚨 Alerta de mascota perdida publicada');
                onOpenChange(false);
                onSuccess?.();
                // Reset form
                setSelectedPetId('');
                setDescription('');
                setLastSeenLocation('');
                setContactPhone('');
                setImageUrl('');
            } else {
                toast.error(data.error || 'Error al publicar');
            }
        } catch (error) {
            toast.error('Error al publicar la alerta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <span className="material-symbols-rounded">emergency</span>
                        Reportar Mascota Perdida
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {/* Pet Selection */}
                    <div className="space-y-2">
                        <Label>¿Es tu mascota?</Label>
                        <Select value={selectedPetId || '_none'} onValueChange={(val) => setSelectedPetId(val === '_none' ? '' : val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una opción" />
                            </SelectTrigger>
                            <SelectContent>
                                {pets.map(pet => (
                                    <SelectItem key={pet.id} value={pet.id}>
                                        {pet.petType === 'dog' ? '🐕' : '🐱'} {pet.name}
                                    </SelectItem>
                                ))}
                                <SelectItem value="_none">No es mi mascota / Otra</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Image Upload - Always show */}
                    <div className="space-y-2">
                        <Label>
                            Foto de la mascota {selectedPetId && <span className="text-slate-400 font-normal">(opcional - usará foto del perfil)</span>}
                        </Label>
                        <div
                            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${imageUrl ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-teal-400 hover:bg-teal-50'
                                }`}
                            onClick={() => document.getElementById('lost-pet-image-input')?.click()}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-teal-500', 'bg-teal-50'); }}
                            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-teal-500', 'bg-teal-50'); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('border-teal-500', 'bg-teal-50');
                                const file = e.dataTransfer.files[0];
                                if (file && file.type.startsWith('image/')) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => setImageUrl(ev.target?.result as string);
                                    reader.readAsDataURL(file);
                                }
                            }}
                        >
                            <input
                                id="lost-pet-image-input"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => setImageUrl(ev.target?.result as string);
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            {imageUrl ? (
                                <div className="relative">
                                    <img src={imageUrl} alt="Preview" className="max-h-32 mx-auto rounded-lg" />
                                    <p className="text-xs text-green-600 mt-2">✓ Imagen cargada</p>
                                    <button
                                        type="button"
                                        className="text-xs text-red-500 hover:underline mt-1"
                                        onClick={(e) => { e.stopPropagation(); setImageUrl(''); }}
                                    >
                                        Quitar imagen
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <span className="material-symbols-rounded text-3xl text-slate-400">add_photo_alternate</span>
                                    <p className="text-sm text-slate-500 mt-1">Arrastra una imagen o haz clic para seleccionar</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label>Descripción *</Label>
                        <Textarea
                            placeholder="Describe a la mascota, características distintivas, circunstancias de la pérdida..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            required
                        />
                    </div>

                    {/* Last Seen Location */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                            <span className="material-symbols-rounded text-sm">location_on</span>
                            Última ubicación vista *
                        </Label>
                        <Input
                            placeholder="Ej: Plaza San Martín, Palermo CABA"
                            value={lastSeenLocation}
                            onChange={(e) => setLastSeenLocation(e.target.value)}
                            required
                        />
                    </div>

                    {/* Contact Phone */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                            <span className="material-symbols-rounded text-sm">call</span>
                            Teléfono de contacto *
                        </Label>
                        <Input
                            placeholder="Ej: 11-4567-8901"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            required
                        />
                    </div>

                    {/* Alert banner */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                        <span className="font-semibold">💡 Tip:</span> Tu alerta será visible para toda la comunidad.
                        Asegúrate de que el teléfono esté correcto.
                    </div>

                    {/* Submit */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                    Publicando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-rounded mr-2">campaign</span>
                                    Publicar Alerta
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
