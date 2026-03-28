import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeJsonParse<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString);
  } catch {
    return defaultValue;
  }
}

export function safeParseImages(imagesJson: string | null | undefined): string[] {
  const parsed = safeJsonParse(imagesJson, []);
  return Array.isArray(parsed) ? parsed.filter((img: unknown): img is string => typeof img === 'string' && img.length > 0) : [];
}

export function safeParseActivities(activitiesJson: string | null | undefined): string[] {
  const parsed = safeJsonParse(activitiesJson, []);
  return Array.isArray(parsed) ? parsed.filter((act: unknown): act is string => typeof act === 'string' && act.length > 0) : [];
}
