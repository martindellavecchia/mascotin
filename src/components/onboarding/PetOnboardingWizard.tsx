'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import StepPetType from './steps/StepPetType';
import StepBasicInfo from './steps/StepBasicInfo';
import StepDetails from './steps/StepDetails';
import StepPersonality from './steps/StepPersonality';
import StepPhotos from './steps/StepPhotos';
import { Card } from '@/components/ui/card';

interface PetOnboardingWizardProps {
    ownerId: string;
    onSuccess: (pet: any) => void;
    onCancel: () => void;
}

export default function PetOnboardingWizard({ ownerId, onSuccess, onCancel }: PetOnboardingWizardProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const totalSteps = 5;

    // Form Data State
    const [formData, setFormData] = useState({
        petType: '',
        name: '',
        breed: '',
        gender: '',
        age: 1,
        size: 'medium',
        weight: 0,
        vaccinated: true,
        neutered: false,
        bio: '',
        energy: 'medium',
        activities: [] as string[], // Initialize as empty array
        location: '',
        images: [] as string[], // Initialize as empty array
    });

    const updateData = (data: Partial<typeof formData>) => {
        setFormData(prev => ({ ...prev, ...data }));
    };

    const nextStep = () => {
        // Validation
        if (currentStep === 1 && !formData.petType) return toast.error('Selecciona un tipo de mascota');
        if (currentStep === 2 && (!formData.name || !formData.gender)) return toast.error('Completa los campos requeridos');

        setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        if (formData.images.length === 0) return toast.error('Sube al menos una foto');

        setLoading(true);
        try {
            const payload = {
                ...formData,
                ownerId,
                images: JSON.stringify(formData.images),
                thumbnailIndex: 0,
                activities: formData.activities, // Already an array
                weight: Number(formData.weight),
                age: Number(formData.age)
            };

            const response = await fetch('/api/pet/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('¡Mascota creada con éxito!');
                onSuccess(data.pet);
            } else {
                toast.error(data.error || 'Error al crear mascota');
            }
        } catch (error) {
            toast.error('Ocurrió un error inesperado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto">
            {/* Progress Bar */}
            <div className="mb-8">
                <div className="flex justify-between text-xs text-teal-600 font-medium mb-2">
                    <span>Paso {currentStep} de {totalSteps}</span>
                    <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
                </div>
                <Progress value={(currentStep / totalSteps) * 100} className="h-2 bg-teal-100" />
            </div>

            <Card className="p-6 min-h-[400px] flex flex-col justify-between shadow-lg border-teal-50">
                <div className="flex-1">
                    {currentStep === 1 && <StepPetType value={formData.petType} onChange={(val) => updateData({ petType: val })} />}
                    {currentStep === 2 && <StepBasicInfo data={formData} updateData={updateData} />}
                    {currentStep === 3 && <StepDetails data={formData} updateData={updateData} />}
                    {currentStep === 4 && <StepPersonality data={formData} updateData={updateData} />}
                    {currentStep === 5 && <StepPhotos images={formData.images} setImages={(imgs: string[]) => updateData({ images: imgs })} />}
                </div>

                <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                    <Button
                        variant="ghost"
                        onClick={currentStep === 1 ? onCancel : prevStep}
                        className="text-gray-500 hover:text-gray-800"
                    >
                        {currentStep === 1 ? 'Cancelar' : 'Atrás'}
                    </Button>

                    {currentStep < totalSteps ? (
                        <Button onClick={nextStep} className="bg-teal-500 hover:bg-teal-600 px-8">
                            Siguiente
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-teal-500 hover:bg-teal-600 text-white px-8"
                        >
                            {loading ? 'Creando...' : 'Finalizar! 🎉'}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
