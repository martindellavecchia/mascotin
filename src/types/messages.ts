// Message Types
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

export interface GroupMessage {
    id: string;
    content: string;
    senderId: string;
    groupId: string;
    createdAt: string;
    sender: {
        id: string;
        name: string;
        image: string | null;
    };
}

export interface MatchWithPet {
    id: string;
    matchId: string;
    name: string;
    breed?: string;
    images: string;
    imageUrls?: string[];
    primaryImageUrl?: string | null;
    petType?: string;
}

export interface Conversation {
    id: string;
    type: 'match' | 'group';
    lastMessage?: Message;
    unreadCount: number;
    updatedAt: string;
}
