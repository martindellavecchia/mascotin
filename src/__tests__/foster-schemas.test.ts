import {
  createRescueCaseSchema,
  fosterMessageSchema,
  fosterProfileSchema,
  updateRescueCaseRadiusSchema,
} from '@/lib/schemas';

const validProfile = {
  acceptsSpecies: ['dog'] as const,
  acceptsSizes: ['medium'] as const,
  capacity: 1,
  location: 'Palermo, CABA',
  latitude: -34.58,
  longitude: -58.42,
  availableFrom: '',
  availableUntil: '',
  maxDurationDays: 30,
  housingType: 'apartment' as const,
  hasYard: false,
  hasKids: false,
  hasOtherPets: false,
  experience: 'some' as const,
  notes: '',
  adultDeclared: true as const,
  termsAccepted: true as const,
};

const validCase = {
  species: 'dog' as const,
  size: 'medium' as const,
  urgency: 'HIGH' as const,
  apparentCondition: 'Está cansado pero puede caminar',
  description: 'Fue encontrado en la calle y necesita un lugar seguro por unos días.',
  images: ['/uploads/rescue.jpg'],
  location: 'Palermo, CABA',
  latitude: -34.58,
  longitude: -58.42,
  requestedDays: 14,
  consentAccepted: true as const,
};

describe('foster schemas', () => {
  it('requires majority declaration and current terms acceptance', () => {
    expect(fosterProfileSchema.safeParse(validProfile).success).toBe(true);
    expect(fosterProfileSchema.safeParse({ ...validProfile, adultDeclared: false }).success).toBe(false);
    expect(fosterProfileSchema.safeParse({ ...validProfile, termsAccepted: false }).success).toBe(false);
  });

  it('uses a 5 km case radius by default', () => {
    const parsed = createRescueCaseSchema.parse(validCase);
    expect(parsed.searchRadiusKm).toBe(5);
  });

  it('accepts configurable radii only between 1 and 50 km', () => {
    expect(updateRescueCaseRadiusSchema.safeParse({ searchRadiusKm: 20 }).success).toBe(true);
    expect(updateRescueCaseRadiusSchema.safeParse({ searchRadiusKm: 0 }).success).toBe(false);
    expect(updateRescueCaseRadiusSchema.safeParse({ searchRadiusKm: 51 }).success).toBe(false);
  });

  it('requires a photo and explicit location consent for a rescue case', () => {
    expect(createRescueCaseSchema.safeParse({ ...validCase, images: [] }).success).toBe(false);
    expect(createRescueCaseSchema.safeParse({ ...validCase, consentAccepted: false }).success).toBe(false);
  });

  it('trims foster chat messages and rejects empty content', () => {
    expect(fosterMessageSchema.parse({ content: '  ¿Cómo coordinamos?  ' }).content).toBe('¿Cómo coordinamos?');
    expect(fosterMessageSchema.safeParse({ content: '   ' }).success).toBe(false);
  });
});
