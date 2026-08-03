/**
 * ============================================================
 * src/lib/utils.ts - Utilidades
 * ============================================================
 * Funciones helper para el proyecto.
 */

// clsx: concatena clases condicionalmente
import { clsx, type ClassValue } from "clsx"

// twMerge: fusiona clases de Tailwind (resuelve conflictos)
import { twMerge } from "tailwind-merge"


/**
 * cn - Funcion helper para clases de Tailwind
 * Combina clsx y twMerge para manejar clases dinamicas
 * 
 * Ejemplo:
 *   cn('px-2 py-1', isActive && 'bg-blue-500', className)
 * 
 * @param inputs - Argumentos de clases
 * @return Clases combinadas sin conflictos
 */
export function cn(...inputs: ClassValue[]) {
  // clsx: convierte arrays/objects a string de clases
  // twMerge: fusiona clases de Tailwind (overridea conflictos)
  return twMerge(clsx(inputs))
}

/**
 * parseEventDate - Convierte fecha de evento a Date
 * Maneja tanto Firebase Timestamp como string ISO
 */
export function parseEventDate(date: any): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (date?.toDate && typeof date.toDate === 'function') return date.toDate();
  if (typeof date === 'string') return new Date(date);
  return null;
}

/**
 * getEventImage - Devuelve la imagen del evento si tiene una,
 * o una imagen aleatoria de picsum como fallback.
 */
export function getEventImage(
  event: { image_url?: string | null; cover_image?: string | null; id: string; category?: string | string[] | null },
  size = '400/300',
  seed?: string
): string {
  if (event.image_url) return event.image_url;
  if (event.cover_image) return event.cover_image;
  const s = seed || event.id;
  return `https://picsum.photos/seed/${s}/${size}`;
}
