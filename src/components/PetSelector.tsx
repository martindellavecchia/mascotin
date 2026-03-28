
import type { Pet } from '@/types';
import Image from 'next/image';
import { safeParseImages } from '@/lib/utils';

interface PetSelectorProps {
  pets: Pet[];
  selectedPetId: string | null;
  onSelect: (petId: string) => void;
  onCreateNew?: () => void;
}

// Helper function para obtener la primera imagen de forma segura
function getFirstImage(imagesJson: string | null | undefined): string {
  const images = safeParseImages(imagesJson);
  if (images.length > 0 && images[0]) {
    const url = images[0];
    // Validate URL to prevent XSS
    if (url.startsWith('javascript:') || url.startsWith('data:') || url.includes('<')) {
      return '/placeholder.svg';
    }
    // Manejar diferentes formatos de URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/')) {
      return url;
    }
    // URL relativa sin /
    return '/' + url;
  }
  return '/placeholder.svg';
}

export default function PetSelector({ pets, selectedPetId, onSelect, onCreateNew }: PetSelectorProps) {
  const getPetIcon = (petType: string) => {
    switch (petType) {
      case 'dog': return '🐕';
      case 'cat': return '🐱';
      case 'bird': return '🐦';
      default: return '🐾';
    }
  };

  if (pets.length === 0) {
    return (
      <div className="bg-gradient-to-r from-secondary to-white border border-border rounded-xl p-4 text-center shadow-sm">
        <p className="text-primary mb-2 font-medium">Aún no tienes mascotas registradas</p>
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="text-primary hover:text-primary-light font-semibold decoration-primary hover:decoration-primary-light transition-all"
          >
            Crear primera mascota
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-gray-700">Swipe como:</span>
        {pets.length > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{pets.length}</span>
        )}
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {pets.map(pet => {
          const firstImage = getFirstImage(pet.images);
          const hasValidImage = firstImage !== '/placeholder.svg';
          const isSelected = selectedPetId === pet.id;

          return (
            <button
              key={pet.id}
              onClick={() => onSelect(pet.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-2 transition-all duration-300 group ${isSelected ? 'scale-105' : 'hover:scale-105 opacity-70 hover:opacity-100'
                }`}
            >
              <div className={`relative p-1 rounded-full transition-all duration-300 ${isSelected
                ? 'bg-gradient-to-tr from-primary to-green-600 shadow-md'
                : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                <div className="w-16 h-16 rounded-full overflow-hidden bg-white border-2 border-white flex items-center justify-center relative">
                  {hasValidImage ? (
                    <Image
                      src={firstImage}
                      alt={pet.name}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="material-symbols-rounded text-4xl">pets</span>
                  )}
                </div>

                {/* Level Badge */}
                <div className="absolute -top-1 -right-1 bg-yellow-400 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm border border-white">
                  {pet.level}
                </div>

                {isSelected && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-teal-500 rounded-full border border-white"></div>
                )}
              </div>

              <span className={`text-xs font-medium truncate max-w-[80px] ${isSelected ? 'text-primary' : 'text-gray-600'}`}>
                {pet.name}
              </span>
            </button>
          );
        })}

        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="flex-shrink-0 flex flex-col items-center gap-2 group"
          >
            <div className="w-[72px] h-[72px] rounded-full bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 group-hover:border-primary group-hover:text-primary transition-all">
              <span className="material-symbols-rounded text-2xl">add</span>
            </div>
            <span className="text-xs font-medium text-gray-500 group-hover:text-primary transition-colors">Agregar</span>
          </button>
        )}
      </div>
    </div>
  );
}
