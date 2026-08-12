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
 * Maneja tanto Firebase Timestamp como string ISO.
 * - Strings con zona horaria ("Z" u offset) → instante absoluto.
 * - Strings sin zona (eventos del scraper) → se asumen en hora de Argentina (UTC-3).
 */
export function parseEventDate(date: any): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (date?.toDate && typeof date.toDate === 'function') return date.toDate();
  if (typeof date === 'string') {
    const s = date.trim();
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s.replace(/\.\d{1,3}$/, '') + '-03:00');
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * toLocalDatetimeString - Formatea una fecha como "YYYY-MM-DDTHH:MM" en hora LOCAL
 * Acepta Date, string ISO, Firebase Timestamp u objetos. Devuelve '' si es inválida.
 */
export function toLocalDatetimeString(date: any): string {
  const d = parseEventDate(date);
  if (!d || isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

/**
 * formatRelativeTime - "hace 5 min", "hace 2 hs", "hace 3 días"
 * Acepta Date, string ISO o Firebase Timestamp.
 */
export function formatRelativeTime(date: any): string {
  const d = parseEventDate(date);
  if (!d || isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} hs`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hace 1 día';
  return `hace ${days} días`;
}

/**
 * formatCountdown - "Hoy", "Mañana", "Faltan N días" hasta una fecha futura.
 * Acepta Date, string ISO o Firebase Timestamp.
 */
export function formatCountdown(date: any): string {
  const d = parseEventDate(date);
  if (!d || isNaN(d.getTime())) return '';
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startEvent = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startEvent.getTime() - startToday.getTime()) / 86400000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `Faltan ${days} días`;
}
