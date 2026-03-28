// Image Helper Utilities

export function getFirstImage(images: string | string[] | undefined | null): string | null {
    if (!images) return null;

    if (Array.isArray(images)) {
        return images.length > 0 ? images[0] : null;
    }

    if (typeof images === 'string') {
        try {
            const parsed = JSON.parse(images);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed[0];
            }
        } catch {
            // Not JSON, check if it's a URL
            if (images.startsWith('http') || images.startsWith('/')) {
                return images;
            }
        }
    }

    return null;
}

export function parseImages(images: string | string[] | null | undefined): string[] {
    if (!images) return [];

    if (Array.isArray(images)) return images;

    if (typeof images === 'string') {
        try {
            const parsed = JSON.parse(images);
            return Array.isArray(parsed) ? parsed : [images];
        } catch {
            return [images];
        }
    }

    return [];
}

export function normalizeImages(images: string | string[] | null | undefined): string[] {
    return parseImages(images).filter(Boolean);
}

export function getPetEmoji(petType: string): string {
    switch (petType) {
        case 'dog': return '🐕';
        case 'cat': return '🐱';
        case 'bird': return '🐦';
        case 'fish': return '🐠';
        case 'rabbit': return '🐰';
        default: return '🐾';
    }
}

export function getStatusColor(status: string): string {
    switch (status) {
        case 'CONFIRMED': return 'text-teal-600';
        case 'PENDING': return 'text-amber-600';
        case 'CANCELLED': return 'text-red-600';
        case 'COMPLETED': return 'text-slate-600';
        default: return 'text-slate-600';
    }
}

export function getStatusLabel(status: string): string {
    switch (status) {
        case 'CONFIRMED': return 'Confirmado';
        case 'PENDING': return 'Pendiente';
        case 'CANCELLED': return 'Cancelado';
        case 'COMPLETED': return 'Completado';
        default: return status;
    }
}
