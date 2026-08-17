export interface FosterProfileView {
  id: string;
  status: 'ACTIVE' | 'PAUSED' | 'SUSPENDED';
  acceptsSpecies: string[];
  acceptsSizes: string[];
  capacity: number;
  occupiedSlots: number;
  location: string;
  latitude: number;
  longitude: number;
  availableFrom: string | null;
  availableUntil: string | null;
  maxDurationDays: number;
  housingType: string;
  hasYard: boolean;
  hasKids: boolean;
  hasOtherPets: boolean;
  experience: string;
  notes: string | null;
  termsVersion: string;
  caseAlertsEnabled: boolean;
  alertRadiusKm: number;
  alertSpecies: string;
  alertUrgencies: string;
}
export interface RescueCaseSummary {
  id: string;
  status: string;
  species: string;
  size: string;
  urgency: string;
  apparentCondition: string;
  description: string;
  images: string[];
  location: string;
  searchRadiusKm: number;
  requestedDays: number;
  createdAt: string;
  offerCount: number;
  interestedCount: number;
  placement: { id: string; status: string } | null;
  isPublished?: boolean;
  adoptionDraft?: { id: string; status: string; listingId: string | null } | null;
  adoptionListing?: { id: string; status: string } | null;
  needs: RescueNeedView[];
}

export type RescueNeedTypeValue = 'FOSTER' | 'VETERINARY' | 'TRANSPORT' | 'SUPPLIES' | 'FIELD_SUPPORT';

export interface RescueNeedView {
  id: string;
  type: RescueNeedTypeValue;
  isPrimary: boolean;
  details: string | null;
  status: 'OPEN' | 'INTERESTED' | 'ASSIGNED' | 'ACTIVE' | 'FULFILLED' | 'CANCELLED';
}

export interface VolunteerProfileView {
  id: string;
  status: 'ACTIVE' | 'PAUSED' | 'SUSPENDED';
  roles: Array<'TRANSPORT' | 'VET_COMPANION' | 'FIELD_SUPPORT' | 'SUPPLIES_LOGISTICS'>;
  location: string;
  radiusKm: number;
  availableFrom: string | null;
  availableUntil: string | null;
  maxConcurrentTasks: number;
  occupiedTasks: number;
  notes: string | null;
  adultDeclaredAt: string;
  termsAcceptedAt: string;
}

export interface FosterOfferSummary {
  id: string;
  status: string;
  distanceKm: number;
  score: number;
  reasons: string[];
  expiresAt: string;
  placement: { id: string; status: string } | null;
  rescueCase: {
    id: string;
    status: string;
    species: string;
    size: string;
    urgency: string;
    apparentCondition: string;
    description: string;
    images: string[];
    location: string;
    requestedDays: number;
    createdAt: string;
    createdBy: { id: string; name: string | null };
  };
}

export interface FosterPlacementSummary {
  id: string;
  status: string;
  rescueCase: {
    id: string;
    species: string;
    location: string;
    images: string[];
  };
}

export interface HelpDashboardData {
  createdCases: RescueCaseSummary[];
  offers: FosterOfferSummary[];
  fosterPlacements: FosterPlacementSummary[];
}
