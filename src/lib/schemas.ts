import { z } from 'zod';

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
  postType: z.enum(['post', 'event', 'lost_pet', 'found_pet']).default('post'),
  eventDate: z.string().optional(),
  eventLocation: z.string().max(200).optional(),
  contactPhone: z.string().max(20).optional(),
  lastSeenLocation: z.string().max(200).optional(),
});

export const createReportSchema = z.object({
  reportedId: z.string().min(1, "El usuario reportado es requerido"),
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
});

export const assignStoreSchema = z.object({
  providerId: z.string().min(1, 'El ID del proveedor es requerido'),
});

// Store customization (provider)
export const providerUpdateStoreSchema = z.object({
  description: z.string().max(1000).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email('Email inválido').optional(),
  address: z.string().max(300).optional(),
  image: z.string().optional(),
  images: z.array(z.string()).max(10).optional(),
});

// Store services (admin or provider)
export const storeServiceSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido').max(150),
  description: z.string().min(5, 'La descripción debe tener al menos 5 caracteres').max(1000),
  price: z.number().positive('El precio debe ser positivo'),
  duration: z.number().int().positive('La duración debe ser positiva'),
  isActive: z.boolean().optional(),
});

export type CreateStoreCategoryData = z.infer<typeof createStoreCategorySchema>;
export type UpdateStoreCategoryData = z.infer<typeof updateStoreCategorySchema>;
export type CreateStoreData = z.infer<typeof createStoreSchema>;
export type UpdateStoreData = z.infer<typeof updateStoreSchema>;
export type AssignStoreData = z.infer<typeof assignStoreSchema>;
export type ProviderUpdateStoreData = z.infer<typeof providerUpdateStoreSchema>;
export type StoreServiceData = z.infer<typeof storeServiceSchema>;

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
