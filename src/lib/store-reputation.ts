export const DEFAULT_STORE_CATEGORIES = [
  { name: 'Veterinaria', description: 'Consultas, prevención y atención veterinaria.' },
  { name: 'Peluquería y grooming', description: 'Baño, corte y cuidado estético.' },
  { name: 'Paseos y cuidadores', description: 'Paseos, visitas y cuidado personalizado.' },
  { name: 'Guardería y hotel', description: 'Alojamiento y cuidado por día o noche.' },
  { name: 'Alimentos y tienda', description: 'Alimentos, accesorios y productos para mascotas.' },
  { name: 'Entrenamiento', description: 'Educación, conducta y entrenamiento.' },
  { name: 'Restaurante pet-friendly', description: 'Bares y restaurantes que reciben mascotas.' },
  { name: 'Plaza y parque', description: 'Espacios públicos y plazas para pasear.' },
  { name: 'Otros', description: 'Otros servicios para mascotas.' },
] as const;

export type StoreTrustLevel =
  | 'NEW'
  | 'TRUSTED'
  | 'HIGHLY_RECOMMENDED'
  | 'MIXED'
  | 'REVIEW_CAREFULLY';

export interface StoreTrustSummary {
  level: StoreTrustLevel;
  label: string;
  description: string;
}

export const STORE_TRUST_TONES: Record<StoreTrustLevel, 'emerald' | 'teal' | 'amber' | 'rose' | 'slate'> = {
  HIGHLY_RECOMMENDED: 'emerald',
  TRUSTED: 'teal',
  MIXED: 'amber',
  REVIEW_CAREFULLY: 'rose',
  NEW: 'slate',
};

export function withStoreTrustPresentation(summary: StoreTrustSummary) {
  return {
    ...summary,
    tone: STORE_TRUST_TONES[summary.level],
  };
}

export function getStoreTrustSummary(
  ratingAverage: number,
  reviewCount: number
): StoreTrustSummary {
  if (reviewCount < 3) {
    return {
      level: 'NEW',
      label: 'Nuevo en Huella',
      description: 'Todavía no tiene suficientes reseñas verificadas.',
    };
  }

  if (ratingAverage >= 4.5 && reviewCount >= 5) {
    return {
      level: 'HIGHLY_RECOMMENDED',
      label: 'Muy recomendado',
      description: 'Mantiene una valoración excelente con experiencia verificada.',
    };
  }

  if (ratingAverage >= 4) {
    return {
      level: 'TRUSTED',
      label: 'Confiable',
      description: 'La comunidad reporta experiencias mayormente positivas.',
    };
  }

  if (ratingAverage >= 3) {
    return {
      level: 'MIXED',
      label: 'Opiniones mixtas',
      description: 'Conviene revisar las experiencias antes de reservar.',
    };
  }

  return {
    level: 'REVIEW_CAREFULLY',
    label: 'Revisá las experiencias',
    description: 'Las reseñas recientes señalan aspectos importantes a considerar.',
  };
}

export function getWeightedStoreScore(
  ratingAverage: number,
  reviewCount: number,
  priorAverage = 3.5,
  priorWeight = 5
): number {
  if (reviewCount <= 0) return priorAverage;

  return (
    (reviewCount / (reviewCount + priorWeight)) * ratingAverage +
    (priorWeight / (reviewCount + priorWeight)) * priorAverage
  );
}
