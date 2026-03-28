// API Response Types
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    nextCursor?: string;
    hasMore: boolean;
    total?: number;
}

// Error Response
export interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
}

// Pagination
export interface PaginationParams {
    limit?: number;
    cursor?: string;
    offset?: number;
}
