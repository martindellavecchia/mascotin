import { createRescueCaseSchema, rescueCasePublicationSchema, solidarityAlertProfileSchema, volunteerProfileSchema } from '@/lib/schemas';
import { calculateRescueCaseStatus, containsPrivatePublicRescueData, matchesSolidaritySubscription, toGeneralZone } from '@/lib/rescue';
import { buildPrivatePushPayload, isPushEligible } from '@/lib/push';
import { scoreVolunteerCandidate } from '@/lib/volunteer';

describe('red solidaria', () => {
  it('mantiene compatibilidad creando FOSTER como necesidad principal', () => {
    const parsed = createRescueCaseSchema.parse({
      species: 'dog',
      size: 'medium',
      urgency: 'NORMAL',
      apparentCondition: 'Está estable',
      description: 'Necesita ayuda temporal mientras encontramos a su familia.',
      images: ['https://example.com/pet.jpg'],
      location: 'Palermo, CABA',
      consentAccepted: true,
    });
    expect(parsed.primaryNeed).toBe('FOSTER');
    expect(parsed.additionalNeeds).toEqual([]);
    expect(parsed.searchRadiusKm).toBe(5);
    expect(parsed.requestedDays).toBe(14);
  });

  it('rechaza necesidades duplicadas y la principal repetida', () => {
    const parsed = createRescueCaseSchema.safeParse({
      species: 'cat', size: 'small', urgency: 'HIGH', apparentCondition: 'Necesita revisión',
      description: 'Se encontró en la vía pública y necesita acompañamiento.', images: ['https://example.com/cat.jpg'],
      location: 'Almagro, CABA', consentAccepted: true, primaryNeed: 'TRANSPORT',
      additionalNeeds: ['TRANSPORT', 'VETERINARY', 'VETERINARY'],
    });
    expect(parsed.success).toBe(false);
  });

  it('valida mayoría de edad, términos, cupo y radio del voluntariado', () => {
    expect(volunteerProfileSchema.safeParse({
      roles: ['TRANSPORT'], location: 'Caballito, CABA', radiusKm: 5, maxConcurrentTasks: 2,
      adultDeclared: true, termsAccepted: true,
    }).success).toBe(true);
    expect(volunteerProfileSchema.safeParse({
      roles: ['TRANSPORT'], location: 'Caballito, CABA', radiusKm: 51, maxConcurrentTasks: 6,
      adultDeclared: false, termsAccepted: false,
    }).success).toBe(false);
  });

  it('prioriza adopción, tránsito y ayuda operativa al recalcular el caso', () => {
    expect(calculateRescueCaseStatus({ currentStatus: 'INTERESTED', needStatuses: ['ASSIGNED'], hasActiveFoster: false, hasOpenAdoption: false })).toBe('COORDINATING');
    expect(calculateRescueCaseStatus({ currentStatus: 'SEARCHING', needStatuses: ['ACTIVE'], hasActiveFoster: false, hasOpenAdoption: false })).toBe('ASSISTANCE_ACTIVE');
    expect(calculateRescueCaseStatus({ currentStatus: 'ASSISTANCE_ACTIVE', needStatuses: ['ACTIVE'], hasActiveFoster: true, hasOpenAdoption: false })).toBe('IN_FOSTER');
    expect(calculateRescueCaseStatus({ currentStatus: 'IN_FOSTER', needStatuses: ['ACTIVE'], hasActiveFoster: true, hasOpenAdoption: true })).toBe('NEEDS_ADOPTION');
    expect(calculateRescueCaseStatus({ currentStatus: 'SEARCHING', needStatuses: ['FULFILLED'], hasActiveFoster: false, hasOpenAdoption: false })).toBe('RESOLVED');
  });

  it('usa el menor radio entre caso y voluntario', () => {
    const base = {
      id: 'profile-1', userId: 'volunteer-1', status: 'ACTIVE' as const, roles: '["TRANSPORT"]',
      latitude: -34.6037, longitude: -58.3816, radiusKm: 1,
      availableFrom: null, availableUntil: null, maxConcurrentTasks: 2, occupiedTasks: 0,
    };
    const near = scoreVolunteerCandidate({
      createdByUserId: 'creator', type: 'TRANSPORT', latitude: -34.6037, longitude: -58.3816, searchRadiusKm: 20,
    }, { ...base, latitude: -34.605 });
    const far = scoreVolunteerCandidate({
      createdByUserId: 'creator', type: 'TRANSPORT', latitude: -34.6037, longitude: -58.3816, searchRadiusKm: 20,
    }, { ...base, latitude: -34.63 });
    expect(near).not.toBeNull();
    expect(far).toBeNull();
  });

  it('aplica filtros y consentimiento en las suscripciones solidarias', () => {
    expect(solidarityAlertProfileSchema.safeParse({
      location: 'Palermo, CABA', locationConsent: true,
      subscriptions: [{ type: 'ADOPTION', enabled: true, radiusKm: 5, species: ['dog'], sizes: ['small'], urgencies: [] }],
    }).success).toBe(true);
    expect(matchesSolidaritySubscription({
      type: 'ADOPTION', species: 'dog', size: 'small', latitude: -34.58, longitude: -58.42,
    }, {
      type: 'ADOPTION', enabled: true, radiusKm: 5, species: '["dog"]', sizes: '["small"]', urgencies: '[]',
      latitude: -34.58, longitude: -58.42,
    })).toBe(true);
  });

  it('crea un payload push mínimo y sin datos privados', () => {
    const payload = buildPrivatePushPayload({
      notificationType: 'FOSTER_CASE_ALERT', title: 'Nuevo caso cerca', link: '/hogares-de-transito/casos/1',
      deliveryId: 'delivery-1', zone: 'Palermo, CABA', helpType: 'Hogar de tránsito',
    });
    expect(Object.keys(payload).sort()).toEqual(['helpType', 'link', 'title', 'zone']);
    expect(JSON.stringify(payload)).not.toMatch(/latitude|longitude|telefono|phone|domicilio/i);
    expect(payload.link).toContain('pushDelivery=delivery-1');
    expect(isPushEligible('MESSAGE')).toBe(true);
    expect(isPushEligible('LIKE')).toBe(false);
  });

  it('generaliza zonas que parecen domicilios', () => {
    expect(toGeneralZone('Av. Siempre Viva 742')).toBe('Zona cercana');
    expect(toGeneralZone('Av. Santa Fe 1234, Palermo, CABA')).toBe('Palermo, CABA');
    expect(containsPrivatePublicRescueData('Escribime al 11 5555-1234')).toBe(true);
    expect(containsPrivatePublicRescueData('Retiro en Avenida Córdoba 1234')).toBe(true);
    expect(containsPrivatePublicRescueData('Zona general de Palermo, sin datos personales')).toBe(false);
  });

  it('rechaza datos privados dentro de una publicación del muro', () => {
    expect(rescueCasePublicationSchema.safeParse({
      summary: 'Necesita tránsito. Contactar al 11 5555-1234 para coordinar.',
      publicZone: 'Palermo, CABA',
      imageIndex: 0,
    }).success).toBe(false);
  });
});
