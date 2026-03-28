// Pet and Health Types
export interface HealthRecord {
    id: string;
    type: string;
    name: string;
    dueDate: string | null;
    status: 'pending' | 'completed' | 'overdue';
}

export interface PetSuggestion {
    id: string;
    name: string;
    petType: string;
    breed: string | null;
    image: string | null;
    matchScore: number;
    matchReason: string;
}

export interface PetStats {
    totalPets: number;
    totalMatches: number;
    totalSwipes: number;
    likesReceived: number;
}

export interface TrendingPet {
    id: string;
    name: string;
    petType: string;
    images: string;
    level: number;
    totalMatches: number;
}
