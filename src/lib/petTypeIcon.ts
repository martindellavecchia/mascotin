const PET_TYPE_LABELS: Record<string, string> = {
  dog: 'Perro',
  cat: 'Gato',
  bird: 'Ave',
  fish: 'Pez',
  rabbit: 'Conejo',
  other: 'Otro',
};

export function getPetTypeLabel(petType: string | null | undefined): string {
  if (!petType) return 'Mascota';
  return PET_TYPE_LABELS[petType] ?? petType;
}
