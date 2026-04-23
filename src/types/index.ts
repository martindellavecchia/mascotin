// Legacy Profile type (for backward compatibility)
export interface Profile {
  id: string;
  name: string;
  bio: string;
  age: number;
  gender: string;
  interests: string;
  location: string;
  images: string;
  createdAt: string;
  updatedAt: string;
  matchId?: string;
}

// New Owner type (for MascotT-In)
export interface Owner {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  location: string;
  bio?: string;
  image?: string;
  hasYard?: boolean;
  hasOtherPets?: boolean;
  createdAt: string;
  updatedAt: string;
}

// New Pet type (for MascotT-In)
export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  petType: string;
  breed?: string;
  age: number;
  weight?: number;
  size: string;
  gender: string;
  vaccinated: boolean;
  neutered: boolean;
  energy: string;
  bio: string;
  activities: string[];
  location: string;
  images: string;
  thumbnailIndex?: number;

  // Gamification basic
  level: number;
  xp: number;
  totalMatches: number;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Optional for display
  owner?: Owner;
  matchId?: string;
}

// Pet types enum
export type PetType = 'dog' | 'cat' | 'bird' | 'other';
export type PetSize = 'small' | 'medium' | 'large' | 'xlarge';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type Activity = 'walk' | 'play' | 'fetch' | 'swim' | 'socialize' | 'groom' | 'training';

export interface SwipeResponse {
  success: boolean;
  matched?: boolean;
  message?: string;
  xpGained?: number; // For gamification
}

export interface Match {
  id: string;
  pet1Id: string;
  pet2Id: string;
  createdAt: string;
  pet: Pet; // Changed from Profile
}

export interface Message {
  id: string;
  matchId?: string;
  groupId?: string;
  senderId: string;
  receiverId?: string;
  content: string;
  read: boolean;
  createdAt: string;
}
export interface Post {
  id: string;
  authorId: string;
  petId?: string;
  content: string;
  images: string; // JSON string
  imageUrls?: string[];
  primaryImageUrl?: string | null;
  location?: string;
  createdAt: string;
  updatedAt: string;

  // Event-related fields
  postType?: string; // 'post' | 'photo' | 'event' | 'question'
  eventDate?: string;
  eventLocation?: string;
  eventId?: string; // Link to Event entity
  isAttending?: boolean;

  author?: {
    id: string;
    name: string | null;
    image: string | null;
  };
  pet?: {
    id: string;
    name: string;
    images: string;
    breed: string | null;
    petType: string;
  };
  _count?: {
    likes: number;
    comments: number;
  };
  isLiked?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: {
    name: string | null;
    image: string | null;
  };
}
