/**
 * ============================================================
 * src/types.ts - Definiciones de Tipos e Interfaces
 * ============================================================
 * Define todas las estructuras de datos usadas en el frontend.
 * Estas interfaces deben coincidir con los schemas de Pydantic en el backend.
 */

// ============================================================
// TIPOS PRIMITIVOS (Type Aliases)
// ============================================================

/**
 * Category - Categorías válidas para eventos
 * El frontend usa algunas categorías en español (nocturno, grupal)
 * y otras en inglés (nightlife, group, solo)
 * El backend solo acepta: cultural, adventure, relax, nightlife, group, solo
 */
export type Category = 
  | 'cultural'     // Eventos culturales (museos, teatro, música)
  | 'adventure'   // Aventura (trekking, deportes)
  | 'relax'       // Relajación (yoga, meditación)
  | 'nocturno'    // (sin usar, duplicado de nightlife)
  | 'grupal'      // (sin usar, duplicado de group)
  | 'nightlife'   // Vida nocturna (bares, boliches)
  | 'group'       // Actividades grupales
  | 'solo';       // Actividades individuales


/**
 * EventStatus - Estados de moderación del evento
 * Coincide con EventStatus en backend/schemas/__init__.py
 */
export type EventStatus = 
  | 'pending'   // Pendiente de aprobación por admin
  | 'approved' // Aprobado y visible en el mapa
  | 'rejected'; // Rechazado por admin


/**
 * UserRole - Roles de usuario en el sistema
 * Coincide con UserRole en backend/schemas/__init__.py
 */
export type UserRole = 
  | 'admin'  // Administrador (puede aprobar eventos)
  | 'user';  // Usuario normal


// ============================================================
// INTERFACES
// ============================================================


/**
 * Location - Ubicación física de un evento
 * Guarda coords GPS y dirección legible
 */
export interface Location {
  /** Dirección textual (ej: "Av. Santa Fe 1234") */
  address: string;
  
  /** Ciudad (ej: "Palermo") */
  city: string;
  
  /** Provincia (ej: "Buenos Aires") */
  province: string;
  
  /** Latitud GPS */
  lat: number;
  
  /** Longitud GPS */
  lng: number;
}


/**
 * Event - Representa un evento en el sistema
 * Corresponde a la tabla events en MariaDB (Backend)
 * NOTA: El backend usa snake_case, el frontend puede usar mapper o camelCase
 */
export interface Event {
  id: string;
  title: string;
  description: string;
  date: any;
  end_date?: any;
  location: Location;
  category: Category;
  status: EventStatus;
  created_by: string;
  author_name: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  image_url?: string;
  created_at: any;
  updated_at?: any;
}


/**
 * UserProfile - Perfil de usuario
 * Corresponde a la tabla users en MariaDB (Backend)
 * NOTA: El backend usa snake_case
 */
export interface UserProfile {
  uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  role: UserRole;
  favorites: string[];
  created_at: any;
  updated_at?: any;
}


/**
 * Notification - Notificaciones del sistema (sin usar)
 * Planeado para alertas de eventos cercanos
 */
export interface Notification {
  /** ID único de la notificación */
  id: string;
  
  /** UID del usuario destinatario */
  userId: string;
  
  /** Título de la notificación */
  title: string;
  
  /** Mensaje de la notificación */
  message: string;
  
  /** Si ya fue leída */
  read: boolean;
  
  /** Fecha de creación */
  createdAt: any;
}


// ============================================================
// RESUMEN: RELACIÓN FRONTEND - BACKEND
// ============================================================
// La base de datos original usaba Firebase Firestore.
// Ahora migramos a MariaDB + FastAPI.
//
// Tipos que mapean:
// - Event (Frontend) ↔ Event (Backend SQLAlchemy)
// - UserProfile (Frontend) ↔ User (Backend SQLAlchemy)
// - Category ↔ EventCategory (Enum)
// - EventStatus ↔ EventStatus (Enum)
// - UserRole ↔ UserRole (Enum)
// - Location ↔ LocationSchema (Pydantic)
//
// NOTA: Algunos tipos en el frontend usan 'nocturno' y 'grupal'
// que el backend no soporta. En producción, normalizar.