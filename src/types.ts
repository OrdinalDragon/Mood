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
  | 'rejected' // Rechazado por admin
  | 'archived'; // Concluido: su fecha ya pasó (pestaña "Eventos concluidos")


/**
 * UserRole - Roles de usuario en el sistema
 * Coincide con UserRole en backend/schemas/__init__.py
 */
export type UserRole = 
  | 'admin'      // Administrador (puede aprobar eventos)
  | 'moderator'  // Moderador
  | 'user';      // Usuario normal


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
  moods?: string[];
  status: EventStatus;
  created_by: string;
  author_name: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  image_url?: string;
  cover_image?: string;
  images?: string[];
  is_free?: boolean;
  is_outdoor?: boolean;
  created_at: any;
  updated_at?: any;
  avg_rating?: number | null;
  rating_count?: number | null;
  claimable?: boolean;
  claim_status?: 'none' | 'pending';
  claim_requested_by?: string | null;
}


/**
 * ClaimPending - Reclamo de un evento por un usuario (para el admin).
 */
export interface ClaimPending {
  id: string;
  title: string;
  date: any;
  location: Location;
  cover_image?: string | null;
  image_url?: string | null;
  claim_requested_by: string;
  claim_requested_at?: any;
  claimant: {
    uid: string;
    email: string | null;
    display_name: string | null;
    photo_url?: string | null;
  } | null;
}


/**
 * UserProfile - Perfil de usuario
 * Corresponde a la tabla users en MariaDB (Backend)
 * NOTA: El backend usa snake_case
 */
export interface UserAdmin {
  uid: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  photo_url: string | null;
  created_at: any;
  email_verified: string;
  auth_provider: string;
  google_id: string | null;
  banned?: boolean;
  banned_at?: any;
}

export interface Ban {
  email: string;
  display_name?: string | null;
  banned_at?: any;
  banned_by?: string | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  role: UserRole;
  favorites: string[];
  created_at: any;
  updated_at?: any;
  email_notifications?: boolean;
}


/**
 * Notification - Notificaciones del sistema
 * Tipos: event_approved | event_rejected | event_submitted | favorite_near
 */
export interface Notification {
  /** ID único de la notificación */
  id: string;

  /** UID del usuario destinatario */
  user_id: string;

  /** Tipo de notificación */
  type: string;

  /** Título de la notificación */
  title: string;

  /** Mensaje de la notificación */
  message: string;

  /** Ruta de la app a la que navega al clickear */
  link?: string | null;

  /** ID del evento relacionado (si aplica) */
  event_id?: string | null;

  /** Fecha del evento (para countdown de favoritos cerca) */
  event_date?: string | null;

  /** Cantidad agregada (notificaciones tipo "hay X ...") */
  event_count?: number | null;

  /** Si ya fue leída */
  read: boolean;

  /** Fecha de creación */
  created_at: string;
}


/**
 * Ad - Anuncio publicitario lateral
 * Corresponde a la colección ads en MongoDB.
 */
export interface Ad {
  id: string;
  badge?: string | null;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  date?: string | null;
  location?: string | null;
  cta_text?: string | null;
  cta_link?: string | null;
  image?: string | null;
  active: boolean;
  order: number;
  hero?: boolean;
  icon?: string | null;
  gradient?: string | null;
  badge_color?: string | null;
  footer?: string | null;
}

/**
 * Review - Valoración y comentario de un usuario sobre un evento.
 * rating va de 1 a 10; se muestra como 5 estrellas con mitades.
 */
export interface Review {
  id: string;
  event_id: string;
  user_id: string;
  author_name?: string | null;
  author_photo?: string | null;
  rating: number;
  comment?: string | null;
  reply?: string | null;
  replied_by?: string | null;
  replied_by_name?: string | null;
  replied_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  event?: {
    id: string;
    title: string;
    date?: string | null;
    image_url?: string | null;
    cover_image?: string | null;
  } | null;
}

/**
 * UserRating - Puntuación general de un organizador (agregado de sus eventos).
 */
export interface UserRating {
  user_id: string;
  avg_rating?: number | null;
  rating_count: number;
}


// ============================================================
// ANALYTICS (estadísticas de uso para el dashboard de admin)
// ============================================================

export type AnalyticsEventType =
  | 'page_view'
  | 'mood_select'
  | 'search'
  | 'event_view'
  | 'favorite'
  | 'review'
  | 'consent';

export interface AnalyticsTopPage {
  page: string;
  views: number;
}

export interface AnalyticsUpcomingEvent {
  id: string;
  title: string;
  date: string;
  location: any;
  category: string[];
  moods: string[];
  is_free: boolean;
}

export interface SummaryStats {
  period_days: number;
  traffic_views: number;
  unique_clients: number;
  unique_ips: number;
  daily_views_by_hour: Record<string, number>;
  weekday_distribution: Record<string, number>;
  top_pages: AnalyticsTopPage[];
  moods_counts: Record<string, number>;
  events_by_status: Record<string, number>;
  events_by_category: Record<string, number>;
  upcoming_events: AnalyticsUpcomingEvent[];
  top_favorites: Record<string, number>;
  top_rated: Record<string, number>;
  users_total: number;
  users_new_per_month: number;
  providers: Record<string, number>;
  engagement_reviews_count: number;
  engagement_favorites_count: number;
  engagement_claims_count: number;
}
