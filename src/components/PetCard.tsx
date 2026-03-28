'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Pet } from '@/types';
import Image from 'next/image';
import { safeParseImages, safeParseActivities } from '@/lib/utils';

interface PetCardProps {
  pet: Pet;
}

export default function PetCard({ pet }: PetCardProps) {
  const images = safeParseImages(typeof pet.images === 'string' ? pet.images : null).filter((img): img is string =>
    typeof img === 'string' && img.length > 0
  );
  
   const mainImage = images[0];
   const showImage = mainImage && mainImage.startsWith('http');

     const activities = Array.isArray(pet.activities) ? pet.activities : safeParseActivities(pet.activities);

   const getPetIcon = () => {
    switch (pet.petType) {
      case 'dog': return '🐕';
      case 'cat': return '🐱';
      case 'bird': return '🐦';
      default: return '🐾';
    }
  };

  const getEnergyColor = () => {
     switch (pet.energy) {
       case 'high': return 'bg-primary';
       case 'medium': return 'bg-warning';
       case 'low': return 'bg-success';
       default: return 'bg-muted';
     }
   };

  const getSizeLabel = () => {
    switch (pet.size) {
      case 'small': return 'Pequeño';
      case 'medium': return 'Mediano';
      case 'large': return 'Grande';
      case 'xlarge': return 'Extra Grande';
      default: return pet.size;
    }
  };

  return (
    <Card className="overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow duration-300">
      <CardContent className="p-0">
        {/* Image Section */}
         <div className="relative w-full aspect-[3/4] overflow-hidden bg-gradient-to-br from-primary/20 to-teal-500/20">
          {showImage ? (
            <Image
              src={mainImage}
              alt={pet.name}
              fill
              className="object-cover"
              priority
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-rounded text-6xl">pets</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Pet Icon and Name Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div><span className="material-symbols-rounded text-4xl" aria-label={`Tipo de mascota: ${pet.petType === 'dog' ? 'perro' : pet.petType === 'cat' ? 'gato' : pet.petType === 'bird' ? 'ave' : 'mascota'}`} role="img">pets</span></div>
              <h2 className="text-3xl font-bold">
                {pet.name}, {pet.age}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <span className="material-symbols-rounded text-lg">location_on</span>
              <span className="text-sm">{pet.location}</span>
            </div>
          </div>

           {/* Level Badge */}
           <div className="absolute top-4 right-4 bg-gradient-to-br from-warning to-amber-700 text-white px-3 py-1 rounded-full shadow-lg">
            <div className="flex items-center gap-1">
              <span className="material-symbols-rounded text-sm">emoji_events</span>
              <span className="font-bold text-sm">Nivel {pet.level}</span>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-6 space-y-4">
          {/* Breed and Size */}
          <div className="flex items-center justify-between">
             <div>
               <p className="text-sm text-text-secondary">Raza</p>
               <p className="font-semibold text-text-main">{pet.breed || 'Mestizo'}</p>
             </div>
            <Badge variant="secondary" className="bg-teal-100 text-green-700">
              {getSizeLabel()}
            </Badge>
          </div>

           {/* Bio */}
          <div>
             <p className="text-text-main leading-relaxed">{pet.bio}</p>
          </div>

          {/* Activities */}
          {activities.length > 0 && (
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-text-secondary font-medium">
                 <span className="material-symbols-rounded w-4 h-4">bolt</span>
                 <span className="text-sm">Actividades</span>
               </div>
              <div className="flex flex-wrap gap-2">
                 {activities.map((activity: string, index: number) => (
                   <Badge
                     key={index}
                     variant="secondary"
                     className="bg-success/20 text-success-foreground hover:bg-success/30 capitalize"
                   >
                     {activity}
                   </Badge>
                 ))}
              </div>
            </div>
          )}

          {/* Energy Level */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <span className="material-symbols-rounded w-4 h-4 text-gray-600">bolt</span>
            <span className="text-sm text-text-secondary">Energía: </span>
            <Badge className={getEnergyColor() + ' text-white'}>
              {pet.energy === 'high' ? 'Alta' : pet.energy === 'medium' ? 'Media' : 'Baja'}
            </Badge>
          </div>

          {/* Badges */}
           <div className="flex gap-2 pt-2 border-t border-border-light dark:border-border-dark">
             {pet.vaccinated && (
               <Badge variant="secondary" className="bg-success/20 text-success-foreground text-xs">
                 💉 Vacunado
               </Badge>
             )}
            {pet.neutered && (
              <Badge variant="secondary" className="bg-accent/20 text-accent-foreground text-xs">
                <span className="material-symbols-rounded text-xs mr-1">content_cut</span>
                Castrado
              </Badge>
            )}
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
