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

export function timeAgo(date: string | Date): string {
  const now = Date.now();
  const d = new Date(date).getTime();
  const diff = Math.floor((now - d) / 1000);

  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
  return new Date(date).toLocaleDateString('es');
}

export function safeParseActivities(activitiesJson: string | null | undefined): string[] {
  const parsed = safeJsonParse(activitiesJson, []);
  return Array.isArray(parsed) ? parsed.filter((act: unknown): act is string => typeof act === 'string' && act.length > 0) : [];
}
