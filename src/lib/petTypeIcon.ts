const PET_TYPE_ICONS: Record<string, string> = {
  dog: 'pets',
  cat: 'pets',
  bird: 'flutter_dash',
  fish: 'water_drop',
  rabbit: 'cruelty_free',
  other: 'pets',
};

const PET_TYPE_LABELS: Record<string, string> = {
  dog: 'Perro',
  cat: 'Gato',
  bird: 'Ave',
  fish: 'Pez',
  rabbit: 'Conejo',
  other: 'Otro',
};

export function getPetTypeIcon(petType: string | null | undefined): string {
  if (!petType) return 'pets';
  return PET_TYPE_ICONS[petType] ?? 'pets';
}

export function getPetTypeLabel(petType: string | null | undefined): string {
  if (!petType) return 'Mascota';
  return PET_TYPE_LABELS[petType] ?? petType;
}
