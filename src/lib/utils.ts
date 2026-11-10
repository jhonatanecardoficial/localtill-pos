import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte campos string vazios para null em um objeto
 * Útil para enviar dados corretos ao Supabase (campos nullable)
 */
export const cleanEmptyStrings = <T extends Record<string, any>>(data: T): T => {
  const cleaned: Record<string, any> = { ...data };
  Object.keys(cleaned).forEach((key) => {
    if (typeof cleaned[key] === 'string' && cleaned[key].trim() === '') {
      cleaned[key] = null;
    }
  });
  return cleaned as T;
};
