import { z } from 'zod';
import { containsPrivatePublicRescueData } from '@/lib/rescue';

export const petSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50),
  petType: z.enum(['dog', 'cat', 'bird', 'other'], {
    message: "El tipo de mascota es requerido",
  }),
  breed: z.string().max(50).optional(),
  age: z.number().min(0, "La edad debe ser positiva").max(30, "Edad no válida"),
  weight: z.number().min(0, "El peso debe ser positivo").max(200, "Peso no válido").optional(),
  size: z.enum(['small', 'medium', 'large', 'xlarge'], {
    message: "El tamaño es requerido",
  }),
  gender: z.enum(['male', 'female'], {
    message: "El género es requerido",
  }),
  vaccinated: z.boolean().default(true),
  neutered: z.boolean().default(false),
  energy: z.enum(['low', 'medium', 'high'], {
    message: "El nivel de energía es requerido",
  }),
  bio: z.string().min(10, "La bio debe tener al menos 10 caracteres").max(500),
  activities: z.array(z.enum(['walk', 'play', 'fetch', 'swim', 'socialize', 'groom', 'training'])).min(1, "Selecciona al menos una actividad"),
  location: z.string().min(2, "La ubicación es requerida").max(100),
  images: z.array(z.string())
    .min(1, "Al menos una imagen es requerida")
    .max(6, "Máximo 6 imágenes"),
  goodWithKids: z.enum(['yes', 'no', 'unknown']).optional(),
  goodWithDogs: z.enum(['yes', 'no', 'unknown']).optional(),
  goodWithCats: z.enum(['yes', 'no', 'unknown']).optional(),
  goodWithStrangers: z.enum(['yes', 'no', 'unknown']).optional(),
  temperament: z.array(z.enum(['sociable', 'territorial', 'anxious', 'playful', 'calm', 'independent'])).optional(),
  microchipId: z.string().max(50).optional(),
  allergies: z.string().max(300).optional(),
  specialNeeds: z.string().max(500).optional(),
  vetClinicName: z.string().max(120).optional(),
  matchIntent: z.array(z.enum(['walk', 'play', 'social', 'sit'])).optional(),
  sharePhoneOnScan: z.boolean().optional(),
  shareVetOnScan: z.boolean().optional(),
});

export const ownerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  phone: z.string().optional(),
  location: z.string().min(2, "La ubicación es requerida").max(100),
  bio: z.string().max(500).optional(),
  image: z.string().optional(),
  hasYard: z.boolean().optional(),
  hasOtherPets: z.boolean().optional(),
});

export const createGroupSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  description: z.string().min(5, "La descripción debe tener al menos 5 caracteres").max(1000),
  image: z.string().optional(),
});

export const createEventSchema = z.object({
  title: z.string().min(2, "El título es requerido").max(200),
  description: z.string().max(2000).optional(),
  date: z.string().min(1, "La fecha es requerida"),
  location: z.string().min(2, "La ubicación es requerida").max(200),
  image: z.string().optional(),
  maxAttendees: z.number().int().positive().optional(),
  groupId: z.string().optional(),
  category: z.enum(['paseo', 'feria', 'adopcion', 'no_convencionales', 'otro']).optional(),
});

export const createAppointmentSchema = z.object({
  serviceId: z.string().min(1, "El servicio es requerido"),
  petId: z.string().min(1, "La mascota es requerida"),
  date: z.string().min(1, "La fecha es requerida"),
});

export const createPostSchema = z.object({
  content: z.string().min(1, "El contenido es requerido").max(5000),
  petId: z.string().optional(),
  images: z.array(z.string()).max(10).optional(),
  location: z.string().max(200).optional(),
  postType: z.enum(['post', 'photo', 'event', 'lost_pet', 'found_pet', 'question', 'recommendation']).default('post'),
  eventDate: z.string().optional(),
  eventLocation: z.string().max(200).optional(),
  contactPhone: z.string().max(20).optional(),
  lastSeenLocation: z.string().max(200).optional(),
});

export const createReportSchema = z.object({
  reportedId: z.string().min(1, "El usuario reportado es requerido"),
  targetType: z.enum(['USER', 'POST', 'COMMENT', 'ALERT']).default('USER'),
  targetId: z.string().optional(),
  reason: z.enum(['spam', 'inappropriate', 'harassment', 'other'], {
    message: "El motivo es requerido",
  }),
  description: z.string().max(1000).optional(),
});

export const updateReportSchema = z.object({
  status: z.enum(['REVIEWED', 'RESOLVED', 'DISMISSED'], {
    message: "El estado es requerido",
  }),
});

export type PetFormData = z.infer<typeof petSchema>;
export type OwnerFormData = z.infer<typeof ownerSchema>;
export type CreateGroupData = z.infer<typeof createGroupSchema>;
export type CreateEventData = z.infer<typeof createEventSchema>;
export type CreateAppointmentData = z.infer<typeof createAppointmentSchema>;
export type CreatePostData = z.infer<typeof createPostSchema>;
export type CreateReportData = z.infer<typeof createReportSchema>;
export type UpdateReportData = z.infer<typeof updateReportSchema>;

// Store Categories (admin)
export const createStoreCategorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  description: z.string().max(500).optional(),
  image: z.string().optional(),
});

export const updateStoreCategorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100).optional(),
  description: z.string().max(500).optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Stores (admin)
export const createStoreSchema = z.object({
  categoryId: z.string().min(1, 'La categoría es requerida'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
  description: z.string().max(1000).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email('Email inválido').optional(),
  address: z.string().max(300).optional(),
  image: z.string().optional(),
});

export const updateStoreSchema = z.object({
  categoryId: z.string().optional(),
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(1000).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email('Email inválido').optional(),
  address: z.string().max(300).optional(),
  image: z.string().optional(),
  images: z.array(z.string()).max(10).optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).max(10).optional(),
  plan: z.enum(['FREE', 'FEATURED']).optional(),
  featuredUntil: z.string().optional(),
});

export const assignStoreSchema = z.object({
  providerId: z.string().min(1, 'El ID del proveedor es requerido'),
});

// Store customization (provider)
export const providerUpdateStoreSchema = z.object({
  categoryId: z.string().min(1, 'La categoría es requerida').optional(),
  name: z.string().trim().min(2, 'El nombre es requerido').max(150).optional(),
  description: z.string().max(1000).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email('Email inválido').optional(),
  address: z.string().max(300).optional(),
  image: z.string().optional(),
  images: z.array(z.string()).max(10).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

export const providerCreateStoreSchema = z.object({
  categoryId: z.string().min(1, 'La categoría es requerida'),
  name: z.string().trim().min(2, 'El nombre es requerido').max(150),
  description: z.string().trim().min(20, 'La descripción debe tener al menos 20 caracteres').max(1000),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email('Email inválido').optional().or(z.literal('')),
  address: z.string().trim().max(300).optional(),
  image: z.string().trim().url('Imagen inválida').optional().or(z.literal('')),
  tags: z.array(z.string()).max(10).optional(),
});

export const storeReviewSchema = z.object({
  rating: z.number().int().min(1, 'Elegí una calificación').max(5),
  comment: z.string().trim().min(20, 'La reseña debe tener al menos 20 caracteres').max(1000).optional().or(z.literal('')),
});

export const businessReplySchema = z.object({
  businessReply: z.string().trim().min(2, 'La respuesta es demasiado corta').max(1000),
});

export const reviewReportSchema = z.object({
  reason: z.enum(['spam', 'inappropriate', 'conflict_of_interest', 'other']),
  description: z.string().trim().max(500).optional(),
});

export const reviewModerationSchema = z.object({
  status: z.enum(['PUBLISHED', 'HIDDEN']),
});

// Store services (admin or provider)
export const storeServiceSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido').max(150),
  description: z.string().min(5, 'La descripción debe tener al menos 5 caracteres').max(1000),
  price: z.coerce.number().positive('El precio debe ser positivo'),
  duration: z.coerce.number().int().positive('La duración debe ser positiva'),
  isActive: z.boolean().optional(),
});

export type CreateStoreCategoryData = z.infer<typeof createStoreCategorySchema>;
export type UpdateStoreCategoryData = z.infer<typeof updateStoreCategorySchema>;
export type CreateStoreData = z.infer<typeof createStoreSchema>;
export type UpdateStoreData = z.infer<typeof updateStoreSchema>;
export type AssignStoreData = z.infer<typeof assignStoreSchema>;
export type ProviderUpdateStoreData = z.infer<typeof providerUpdateStoreSchema>;
export type ProviderCreateStoreData = z.infer<typeof providerCreateStoreSchema>;
export type StoreServiceData = z.infer<typeof storeServiceSchema>;
export type StoreReviewData = z.infer<typeof storeReviewSchema>;

// Provider access request
export const createProviderRequestSchema = z.object({
  businessName: z.string().min(2, 'El nombre del negocio es requerido').max(150),
  location: z.string().min(2, 'La ubicación es requerida').max(200),
  description: z.string().max(1000).optional(),
  reason: z.string().min(10, 'Explica por qué quieres ser proveedor (mín. 10 caracteres)').max(1000),
});

export const reviewProviderRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  adminNote: z.string().max(500).optional(),
});

export type CreateProviderRequestData = z.infer<typeof createProviderRequestSchema>;
export type ReviewProviderRequestData = z.infer<typeof reviewProviderRequestSchema>;

// User settings
export const updateSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  matchingPaused: z.boolean().optional(),
  matchDistance: z.number().int().min(1).max(500).optional(),
  matchPetTypes: z.array(z.enum(['dog', 'cat', 'bird', 'other'])).optional(),
  matchPetSizes: z.array(z.enum(['small', 'medium', 'large', 'xlarge'])).optional(),
  notifyMatches: z.boolean().optional(),
  notifyMessages: z.boolean().optional(),
  notifyComments: z.boolean().optional(),
  notifyEvents: z.boolean().optional(),
  notifyHealth: z.boolean().optional(),
  notifyFoster: z.boolean().optional(),
  profileVisible: z.boolean().optional(),
  hideResolvedLostPets: z.boolean().optional(),
});

export const passwordSchema = z.string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
  .regex(/[a-z]/, 'La contraseña debe contener al menos una minúscula')
  .regex(/[0-9]/, 'La contraseña debe contener al menos un número');

export const loginSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().trim().email('Email inválido'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: passwordSchema,
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'La contraseña es requerida para confirmar'),
});

export type UpdateSettingsData = z.infer<typeof updateSettingsSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type DeleteAccountData = z.infer<typeof deleteAccountSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

export const createSightingSchema = z.object({
  notes: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  image: z.string().optional(),
});

export const adopterProfileSchema = z.object({
  housingType: z.enum(['apartment', 'house', 'other']),
  hasYard: z.boolean().default(false),
  hasKids: z.boolean().default(false),
  hasOtherPets: z.boolean().default(false),
  experience: z.enum(['none', 'some', 'experienced']),
  hoursAvailable: z.string().max(120).optional(),
  notes: z.string().max(1000).optional(),
});

export const createAdoptionListingSchema = z.object({
  petId: z.string().min(1, 'La mascota es requerida'),
  character: z.string().min(10, 'Describí el carácter de la mascota').max(1000),
  specialNeeds: z.string().max(1000).optional(),
  requirements: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
});

export const createAdoptionApplicationSchema = z.object({
  message: z.string().min(20, 'Contá por qué querés adoptar').max(2000),
});

export const reviewAdoptionApplicationSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
});

const locationFields = {
  location: z.string().trim().min(2, 'Ingresá una zona').max(200),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
};

export const fosterProfileSchema = z.object({
  acceptsSpecies: z.array(z.enum(['dog', 'cat', 'other'])).min(1, 'Elegí al menos una especie'),
  acceptsSizes: z.array(z.enum(['small', 'medium', 'large', 'any'])).min(1, 'Elegí al menos un tamaño'),
  capacity: z.number().int().min(1).max(5),
  ...locationFields,
  availableFrom: z.string().date().optional().or(z.literal('')),
  availableUntil: z.string().date().optional().or(z.literal('')),
  maxDurationDays: z.number().int().min(1).max(90),
  housingType: z.enum(['apartment', 'house', 'other']),
  hasYard: z.boolean().default(false),
  hasKids: z.boolean().default(false),
  hasOtherPets: z.boolean().default(false),
  experience: z.enum(['none', 'some', 'experienced']),
  notes: z.string().trim().max(1000).optional(),
  adultDeclared: z.literal(true, { error: 'Debés confirmar que sos mayor de 18 años' }),
  termsAccepted: z.literal(true, { error: 'Debés aceptar los términos del tránsito' }),
});

export const updateFosterProfileStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED']),
});

export const createRescueCaseSchema = z.object({
  species: z.enum(['dog', 'cat', 'other']),
  size: z.enum(['small', 'medium', 'large']),
  urgency: z.enum(['NORMAL', 'HIGH', 'CRITICAL']),
  apparentCondition: z.string().trim().min(3, 'Describí el estado aparente').max(300),
  description: z.string().trim().min(20, 'Contanos un poco más sobre la situación').max(2000),
  images: z.array(z.string()).min(1, 'Agregá al menos una foto').max(3),
  ...locationFields,
  searchRadiusKm: z.number().int().min(1).max(50).default(5),
  requestedDays: z.number().int().min(1).max(90).default(14),
  primaryNeed: z.enum(['FOSTER', 'VETERINARY', 'TRANSPORT', 'SUPPLIES', 'FIELD_SUPPORT']).default('FOSTER'),
  additionalNeeds: z.array(z.enum(['FOSTER', 'VETERINARY', 'TRANSPORT', 'SUPPLIES', 'FIELD_SUPPORT']))
    .max(4, 'Podés sumar hasta cuatro ayudas complementarias')
    .default([]),
  needDetails: z.record(z.string(), z.string().trim().max(500)).optional(),
  consentAccepted: z.literal(true, { error: 'Debés aceptar el consentimiento de ubicación' }),
}).superRefine((data, context) => {
  const uniqueNeeds = new Set(data.additionalNeeds);
  if (uniqueNeeds.size !== data.additionalNeeds.length) {
    context.addIssue({ code: 'custom', path: ['additionalNeeds'], message: 'No repitas tipos de ayuda' });
  }
  if (uniqueNeeds.has(data.primaryNeed)) {
    context.addIssue({ code: 'custom', path: ['additionalNeeds'], message: 'La ayuda principal no puede repetirse' });
  }
  const allowed = new Set(['FOSTER', 'VETERINARY', 'TRANSPORT', 'SUPPLIES', 'FIELD_SUPPORT']);
  for (const key of Object.keys(data.needDetails || {})) {
    if (!allowed.has(key)) {
      context.addIssue({ code: 'custom', path: ['needDetails', key], message: 'Tipo de ayuda inválido' });
    }
  }
});

export const updateRescueCaseRadiusSchema = z.object({
  searchRadiusKm: z.number().int().min(1).max(50),
});

export const respondFosterOfferSchema = z.object({
  response: z.enum(['INTERESTED', 'DECLINED']),
});

export const completeFosterPlacementSchema = z.object({
  outcome: z.enum(['RESOLVED', 'NEEDS_ADOPTION']),
});

export const rescueCasePublicationSchema = z.object({
  summary: z.string().trim().min(20, 'El resumen debe tener al menos 20 caracteres').max(1000)
    .refine((value) => !containsPrivatePublicRescueData(value), 'No incluyas teléfonos, correos ni domicilios en el resumen público'),
  publicZone: z.string().trim().min(2, 'Indicá una zona general').max(120),
  imageIndex: z.number().int().min(0).max(2).default(0),
});

export const fosterAlertPreferencesSchema = z.object({
  enabled: z.boolean(),
  radiusKm: z.number().int().min(1).max(50).default(5),
  species: z.array(z.enum(['dog', 'cat', 'other'])).min(1, 'Elegí al menos una especie'),
  urgencies: z.array(z.enum(['NORMAL', 'HIGH', 'CRITICAL'])).min(1, 'Elegí al menos una urgencia'),
});

export const volunteerProfileSchema = z.object({
  roles: z.array(z.enum(['TRANSPORT', 'VET_COMPANION', 'FIELD_SUPPORT', 'SUPPLIES_LOGISTICS']))
    .min(1, 'Elegí al menos un tipo de ayuda'),
  ...locationFields,
  radiusKm: z.number().int().min(1).max(50).default(5),
  availableFrom: z.string().date().optional().or(z.literal('')),
  availableUntil: z.string().date().optional().or(z.literal('')),
  maxConcurrentTasks: z.number().int().min(1).max(5),
  notes: z.string().trim().max(1000).optional(),
  adultDeclared: z.literal(true, { error: 'Debés confirmar que sos mayor de 18 años' }),
  termsAccepted: z.literal(true, { error: 'Debés aceptar los términos del voluntariado' }),
}).superRefine((data, context) => {
  if (data.availableFrom && data.availableUntil && data.availableFrom > data.availableUntil) {
    context.addIssue({ code: 'custom', path: ['availableUntil'], message: 'La fecha final debe ser posterior a la inicial' });
  }
});

export const updateVolunteerProfileStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED']),
});

export const respondVolunteerOfferSchema = z.object({
  response: z.enum(['INTERESTED', 'DECLINED']),
});

export const cancelVolunteerAssignmentSchema = z.object({
  reason: z.string().trim().min(3, 'Contanos brevemente el motivo').max(500),
});

const solidaritySubscriptionSchema = z.object({
  type: z.enum(['FOSTER', 'ADOPTION', 'VETERINARY']),
  enabled: z.boolean().default(false),
  radiusKm: z.number().int().min(1).max(50).default(5),
  species: z.array(z.enum(['dog', 'cat', 'other'])).default([]),
  sizes: z.array(z.enum(['small', 'medium', 'large'])).default([]),
  urgencies: z.array(z.enum(['NORMAL', 'HIGH', 'CRITICAL'])).default([]),
});

export const solidarityAlertProfileSchema = z.object({
  ...locationFields,
  locationConsent: z.literal(true, { error: 'Debés aceptar el uso privado de tu ubicación' }),
  subscriptions: z.array(solidaritySubscriptionSchema).max(3).default([]),
}).superRefine((data, context) => {
  const types = data.subscriptions.map((subscription) => subscription.type);
  if (new Set(types).size !== types.length) {
    context.addIssue({ code: 'custom', path: ['subscriptions'], message: 'No repitas categorías de alertas' });
  }
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(20).max(500),
    auth: z.string().min(8).max(500),
  }),
});

export const pushReceiptSchema = z.object({
  deliveryId: z.string().min(1),
  event: z.enum(['RECEIVED', 'CLICKED']),
});

const knownUnknown = z.enum(['yes', 'no', 'unknown']);

export const fosterAdoptionDraftSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(50),
  breed: z.string().trim().max(80).optional().or(z.literal('')),
  estimatedAge: z.number().int().min(0).max(30),
  gender: z.enum(['male', 'female', 'unknown']),
  energy: z.enum(['low', 'medium', 'high', 'unknown']),
  character: z.string().trim().min(10, 'Describí el carácter del animal').max(1000),
  bio: z.string().trim().min(20, 'Contá un poco más sobre el animal').max(2000),
  goodWithKids: knownUnknown,
  goodWithDogs: knownUnknown,
  goodWithCats: knownUnknown,
  vaccinated: z.boolean().nullable(),
  neutered: z.boolean().nullable(),
  specialNeeds: z.string().trim().max(1000).optional().or(z.literal('')),
  requirements: z.string().trim().max(1000).optional().or(z.literal('')),
  publicZone: z.string().trim().min(2, 'Indicá una zona general').max(120),
  images: z.array(z.string()).min(1, 'Agregá al menos una foto').max(6),
});

export const adoptionHandoffConfirmSchema = z.object({
  ownerName: z.string().trim().min(2).max(100).optional(),
  ownerLocation: z.string().trim().min(2).max(200).optional(),
});

export const fosterMessageSchema = z.object({
  content: z.string().trim().min(1, 'Escribí un mensaje').max(2000),
});

export const storePromotionSchema = z.object({
  title: z.string().min(2, 'El título es requerido').max(120),
  body: z.string().min(10, 'La promoción debe tener al menos 10 caracteres').max(500),
  startsAt: z.string().min(1, 'La fecha de inicio es requerida'),
  endsAt: z.string().min(1, 'La fecha de fin es requerida'),
});

export type AdopterProfileData = z.infer<typeof adopterProfileSchema>;
export type CreateAdoptionListingData = z.infer<typeof createAdoptionListingSchema>;
export type CreateAdoptionApplicationData = z.infer<typeof createAdoptionApplicationSchema>;
export type FosterProfileData = z.infer<typeof fosterProfileSchema>;
export type CreateRescueCaseData = z.infer<typeof createRescueCaseSchema>;
export type RescueCasePublicationData = z.infer<typeof rescueCasePublicationSchema>;
export type FosterAlertPreferencesData = z.infer<typeof fosterAlertPreferencesSchema>;
export type VolunteerProfileData = z.infer<typeof volunteerProfileSchema>;
export type SolidarityAlertProfileData = z.infer<typeof solidarityAlertProfileSchema>;
export type PushSubscriptionData = z.infer<typeof pushSubscriptionSchema>;
export type FosterAdoptionDraftData = z.infer<typeof fosterAdoptionDraftSchema>;
export type StorePromotionData = z.infer<typeof storePromotionSchema>;
