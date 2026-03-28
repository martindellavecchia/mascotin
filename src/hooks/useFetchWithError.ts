'use client';

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface FetchOptions extends RequestInit {
    timeout?: number;
    showError?: boolean;
    retries?: number;
    retryDelay?: number;
}

function extractErrorMessage(data: unknown, fallback: string): string {
    if (data && typeof data === 'object' && 'error' in data) {
        const message = (data as { error?: unknown }).error;
        if (typeof message === 'string' && message.trim().length > 0) {
            return message;
        }
    }
    return fallback;
}

export function useFetchWithError() {
    const abortControllersRef = useRef<Set<AbortController>>(new Set());

    const fetchWithError = useCallback(async <T>(
        url: string,
        options?: FetchOptions
    ): Promise<ApiResponse<T>> => {
        const {
            timeout = 30000,
            showError = true,
            retries = 0,
            retryDelay = 800,
            ...fetchOptions
        } = options || {};

        let lastError: string | null = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
            const controller = new AbortController();
            abortControllersRef.current.add(controller);
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                const headers = new Headers(fetchOptions.headers);
                const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
                if (!headers.has('Content-Type') && !isFormData) {
                    headers.set('Content-Type', 'application/json');
                }

                const response = await fetch(url, {
                    ...fetchOptions,
                    signal: controller.signal,
                    headers,
                });

                const raw = await response.text();
                const parsedData = raw ? (() => {
                    try {
                        return JSON.parse(raw);
                    } catch {
                        return raw;
                    }
                })() : {};

                if (!response.ok) {
                    const errorMessage = extractErrorMessage(parsedData, 'Error en la solicitud');
                    if (showError) {
                        toast.error(errorMessage);
                    }
                    return { success: false, error: errorMessage };
                }

                return { success: true, data: parsedData as T };
            } catch (error) {
                const aborted = error instanceof Error && error.name === 'AbortError';
                lastError = aborted ? 'Solicitud cancelada' : (error instanceof Error ? error.message : 'Error de conexión');

                if (attempt < retries) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelay));
                    continue;
                }

                if (showError && !aborted) {
                    toast.error('Error de conexión');
                }

                return { success: false, error: lastError };
            } finally {
                clearTimeout(timeoutId);
                abortControllersRef.current.delete(controller);
            }
        }

        return { success: false, error: lastError || 'Error de conexión' };
    }, []);

    const abort = useCallback(() => {
        abortControllersRef.current.forEach((controller) => controller.abort());
        abortControllersRef.current.clear();
    }, []);

    return { fetchWithError, abort };
}
