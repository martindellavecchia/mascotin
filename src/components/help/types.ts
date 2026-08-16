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
