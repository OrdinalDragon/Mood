/**
 * utils/sanitizer.ts - Sanitización de inputs para prevenir XSS
 */

/**
 * sanitizeString - Limpia un string de caracteres peligrosos
 * @param input - String a sanitizar
 * @returns String limpio
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/[<>'"]/g, '') // Eliminar < > ' "
    .trim();
}

/**
 * sanitizeEmail - Valida y limpia un email
 * @param email - Email a sanitizar
 * @returns Email limpio o null si es inválido
 */
export function sanitizeEmail(email: string): string | null {
  if (!email) return null;
  
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /\S+@\S+\.\S+/;
  
  if (!emailRegex.test(cleaned)) return null;
  return cleaned;
}

/**
 * sanitizeName - Limpia un nombre (solo letras, espacios y algunos caracteres)
 * @param name - Nombre a sanitizar
 * @returns Nombre limpio
 */
export function sanitizeName(name: string): string {
  if (!name) return '';
  
  return name
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s-']/g, '')
    .trim()
    .slice(0, 100); // Máximo 100 caracteres
}

/**
 * sanitizePhone - Limpia un número de teléfono
 * @param phone - Teléfono a sanitizar
 * @returns Teléfono limpio
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  
  return phone
    .replace(/[^\d\s+()-]/g, '')
    .trim()
    .slice(0, 20); // Máximo 20 caracteres
}

/**
 * sanitizeInput - Sanitiza un input genérico
 * @param input - Input a sanitizar
 * @param type - Tipo de input (email, name, phone, text)
 * @returns Input sanitizado
 */
export function sanitizeInput(input: string, type: 'email' | 'name' | 'phone' | 'text' = 'text'): string | null {
  switch (type) {
    case 'email':
      return sanitizeEmail(input);
    case 'name':
      return sanitizeName(input);
    case 'phone':
      return sanitizePhone(input);
    case 'text':
    default:
      return sanitizeString(input);
  }
}
