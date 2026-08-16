import {
  createRescueCaseSchema,
  fosterMessageSchema,
  fosterAdoptionDraftSchema,
  fosterAlertPreferencesSchema,
  fosterProfileSchema,
  rescueCasePublicationSchema,
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

  it('keeps foster alerts opt-in with a configurable 1-50 km radius', () => {
    const preferences = {
      enabled: true,
      radiusKm: 5,
      species: ['dog'],
      urgencies: ['HIGH', 'CRITICAL'],
    };
    expect(fosterAlertPreferencesSchema.safeParse(preferences).success).toBe(true);
    expect(fosterAlertPreferencesSchema.safeParse({ ...preferences, radiusKm: 51 }).success).toBe(false);
    expect(fosterAlertPreferencesSchema.safeParse({ ...preferences, species: [] }).success).toBe(false);
  });

  it('requires a safe summary and general zone before publishing a case', () => {
    expect(rescueCasePublicationSchema.safeParse({
      summary: 'Necesita un hogar temporal mientras se recupera.',
      publicZone: 'Palermo, CABA',
      imageIndex: 0,
    }).success).toBe(true);
    expect(rescueCasePublicationSchema.safeParse({
      summary: 'Muy corto',
      publicZone: '',
      imageIndex: 0,
    }).success).toBe(false);
  });

  it('allows unknown health data in a foster adoption draft', () => {
    expect(fosterAdoptionDraftSchema.safeParse({
      name: 'Milo',
      breed: '',
      estimatedAge: 2,
      gender: 'unknown',
      energy: 'medium',
      character: 'Es sociable y tranquilo con las personas.',
      bio: 'Fue rescatado y se encuentra aprendiendo rutinas dentro del hogar.',
      goodWithKids: 'unknown',
      goodWithDogs: 'yes',
      goodWithCats: 'unknown',
      vaccinated: null,
      neutered: null,
      specialNeeds: '',
      requirements: '',
      publicZone: 'Palermo, CABA',
      images: ['/uploads/rescue.jpg'],
    }).success).toBe(true);
  });
});
