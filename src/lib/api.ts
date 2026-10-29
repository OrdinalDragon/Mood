/**
 * src/lib/api.ts - Cliente HTTP para el Backend
 * Helper para hacer requests al API de FastAPI.
 */

import { Event, UserProfile, UserAdmin, Ad, Ban, Notification, Review, UserRating, ClaimPending } from '../types';

// URL del API desde variables de entorno
const API_URL = import.meta.env.VITE_API_URL || '/api';

// El access token vive solo en memoria: un XSS no puede leerlo de localStorage.
// Al recargar la página se recupera con el refresh token HttpOnly.
let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

// Endpoints que no deben intentar refrescar: o son públicos, o el refresh
// mismo, o ya manejan el segundo factor. El resto (incluido /auth/me) sí.
const NO_REFRESH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/refresh',
  '/auth/mfa/verify',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/resend-verification',
  '/auth/verify-email',
];

function canRefreshAfter401(url: string): boolean {
  return !NO_REFRESH_PATHS.some((path) => url.startsWith(path));
}

export function getToken(): string | null {
  return accessToken;
}

export function setToken(token: string): void {
  accessToken = token;
}

export function removeToken(): void {
  accessToken = null;
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return null;
}

function csrfHeaders(): Record<string, string> {
  const token = readCookie('mood_csrf');
  return token ? { 'X-CSRF-Token': token } : {};
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data.detail === 'string') return data.detail;
  } catch {
    // sin JSON: usamos el status
  }
  if (response.status === 401) return 'Sesión expirada. Iniciá sesión de nuevo.';
  if (response.status === 429) return 'Demasiadas solicitudes. Esperá un momento.';
  return `Error ${response.status}`;
}

/** Renueva el access token usando la cookie HttpOnly. Singleton para evitar
 *  varias llamadas concurrentes cuando varias requests reciben 401. */
async function performRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfHeaders(),
    });
    if (!response.ok) {
      if (response.status === 401) removeToken();
      return false;
    }
    const data = await response.json();
    if (!data?.access_token) {
      removeToken();
      return false;
    }
    setToken(data.access_token);
    return true;
  } catch {
    return false;
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    // La cookie CSRF (legible) indica que puede haber una sesión. Sin ella no
    // llamamos al endpoint: evita un 403 en consola y ahorra rate limit en
    // visitas anónimas.
    const hadSessionHint = Boolean(readCookie('mood_csrf'));
    if (!hadSessionHint) return false;
    if (await performRefresh()) return true;
    // Si otra pestaña rotó el token hace milisegundos, la cookie compartida
    // ya es la nueva. Un segundo intento evita deslogueos por carrera.
    await new Promise((resolve) => setTimeout(resolve, 300));
    return performRefresh();
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// Fetch con headers de auth + refresh automático ante 401.
async function apiFetch<T>(url: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && retry && canRefreshAfter401(url)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiFetch<T>(url, options, false);
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Obtener eventos del backend
export async function getEvents(status: string = 'approved', sort?: string): Promise<Event[]> {
  return apiFetch<Event[]>(`/events/?status_filter=${status}${sort ? `&sort=${sort}` : ''}`);
}

// Obtener eventos pendientes (para admin)
export async function getPendingEvents(): Promise<Event[]> {
  return apiFetch<Event[]>('/events/?status_filter=pending');
}

// Aprobar evento
export async function approveEvent(id: string): Promise<Event> {
  return apiFetch<Event>(`/events/${id}/approve`, {
    method: 'PATCH',
  });
}

// Rechazar evento
export async function rejectEvent(id: string): Promise<Event> {
  return apiFetch<Event>(`/events/${id}/reject`, {
    method: 'PATCH',
  });
}

// Eliminar evento
export async function deleteEvent(id: string): Promise<void> {
  await apiFetch<void>(`/events/${id}`, {
    method: 'DELETE',
  });
}

// Actualizar evento
export async function updateEvent(id: string, data: Partial<Event>): Promise<Event> {
  return apiFetch<Event>(`/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Obtener un evento específico
export async function getEvent(id: string): Promise<Event> {
  return apiFetch<Event>(`/events/${id}`);
}

// Reclamar un evento subido por MOOD (el usuario pasa a ser el organizador propuesto)
export async function claimEvent(id: string): Promise<Event> {
  return apiFetch<Event>(`/events/${id}/claim`, {
    method: 'POST',
  });
}

// Listar reclamos pendientes (admin only)
export async function getPendingClaims(): Promise<ClaimPending[]> {
  return apiFetch<ClaimPending[]>('/events/claims/pending');
}

// Aprobar un reclamo (admin only)
export async function approveClaim(id: string): Promise<Event> {
  return apiFetch<Event>(`/events/${id}/claim/approve`, {
    method: 'PATCH',
  });
}

// Rechazar un reclamo (admin only)
export async function rejectClaim(id: string): Promise<Event> {
  return apiFetch<Event>(`/events/${id}/claim/reject`, {
    method: 'PATCH',
  });
}

// Subir imagen al servidor
export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const send = async (): Promise<Response> => {
    const token = getToken();
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_URL}/upload/`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });
  };

  let response = await send();
  if (response.status === 401 && (await refreshAccessToken())) {
    response = await send();
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

// Obtener counts reales (hoy, finde, gratis, aire libre)
export async function getEventCounts(): Promise<{ today: number; weekend: number; free: number; outdoor: number }> {
  return apiFetch('/events/counts');
}

// Crear evento
export async function createEvent(event: Partial<Event>): Promise<Event> {
  return apiFetch<Event>('/events/', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

// Obtener perfil de usuario
export async function getMe(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/auth/me');
}

// Actualizar perfil de usuario (nombre, foto y/o recordatorios por email)
export async function updateProfile(data: { display_name?: string; photo_url?: string; email_notifications?: boolean }): Promise<UserProfile> {
  return apiFetch<UserProfile>('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Cambiar contraseña
export async function changePassword(current_password: string, new_password: string): Promise<{ message: string }> {
  const result = await apiFetch<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  });
  // El backend revoca todas las sesiones al cambiar la contraseña.
  removeToken();
  return result;
}

// Obtener eventos creados por el usuario autenticado
export async function getMyEvents(): Promise<Event[]> {
  return apiFetch<Event[]>('/events/mine');
}

// Obtener perfil de usuario (alias)
export async function getUserProfile(): Promise<UserProfile> {
  return getMe();
}

// Get all users (admin only)
export async function getUsers(): Promise<UserAdmin[]> {
  return apiFetch<UserAdmin[]>('/auth/users');
}

// Update user role (admin only)
export async function updateUserRole(uid: string, role: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/users/${uid}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

// Delete user (admin only)
export async function deleteUser(uid: string): Promise<void> {
  await apiFetch<void>(`/auth/users/${uid}`, {
    method: 'DELETE',
  });
}

// Ban user (admin only)
export async function banUser(uid: string): Promise<{ message: string; email: string }> {
  return apiFetch<{ message: string; email: string }>(`/auth/users/${uid}/ban`, {
    method: 'POST',
  });
}

// List banned emails (admin only)
export async function getBans(): Promise<Ban[]> {
  return apiFetch<Ban[]>('/auth/bans');
}

// Unban email (admin only)
export async function unbanUser(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/bans/unban', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// Logout: revoca la sesión en el servidor y borra las cookies.
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfHeaders(),
    });
  } catch {
    // Aunque el servidor no responda, limpiamos el estado local.
  } finally {
    removeToken();
  }
}

// Listar notificaciones del usuario (máx. 10, no leídas primero)
export async function getNotifications(): Promise<Notification[]> {
  return apiFetch<Notification[]>('/notifications/');
}

// Contador de notificaciones no leídas
export async function getUnreadCount(): Promise<{ unread_count: number }> {
  return apiFetch<{ unread_count: number }>('/notifications/unread-count');
}

// Marcar una notificación como leída
export async function markNotificationRead(id: string): Promise<Notification> {
  return apiFetch<Notification>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

// Marcar todas las notificaciones como leídas
export async function markAllNotificationsRead(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/notifications/read-all', {
    method: 'PATCH',
  });
}

export async function getFavorites(): Promise<Event[]> {
  return apiFetch<Event[]>('/favorites/');
}

export async function addFavorite(eventId: string): Promise<{ message: string; favorites: string[] }> {
  return apiFetch<{ message: string; favorites: string[] }>(`/favorites/${eventId}`, {
    method: 'POST',
  });
}

export async function removeFavorite(eventId: string): Promise<{ message: string; favorites: string[] }> {
  return apiFetch<{ message: string; favorites: string[] }>(`/favorites/${eventId}`, {
    method: 'DELETE',
  });
}

// Obtener anuncios publicitarios (público)
export async function getAds(): Promise<Ad[]> {
  return apiFetch<Ad[]>('/ads/');
}

// Obtener todos los anuncios incluyendo inactivos (admin)
export async function getAdsAdmin(): Promise<Ad[]> {
  return apiFetch<Ad[]>('/ads/admin');
}

// Crear anuncio (admin)
export async function createAd(data: Partial<Ad>): Promise<{ message: string; id: string }> {
  return apiFetch<{ message: string; id: string }>('/ads/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Actualizar anuncio (admin)
export async function updateAd(adId: string, data: Partial<Ad>): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/ads/${adId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Eliminar anuncio (admin)
export async function deleteAd(adId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/ads/${adId}`, {
    method: 'DELETE',
  });
}

// Crear o actualizar la valoración del usuario sobre un evento
export async function createReview(eventId: string, rating: number, comment?: string): Promise<Review> {
  return apiFetch<Review>(`/reviews/${eventId}`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment: comment || null }),
  });
}

// Listar valoraciones de un evento (público)
export async function getEventReviews(eventId: string): Promise<Review[]> {
  return apiFetch<Review[]>(`/reviews/event/${eventId}`);
}

// Valoraciones del usuario autenticado (con datos del evento)
export async function getMyReviews(): Promise<Review[]> {
  return apiFetch<Review[]>('/reviews/mine');
}

// Valoraciones recibidas en los eventos del usuario (organizador)
export async function getCreatorReviews(): Promise<Review[]> {
  return apiFetch<Review[]>('/reviews/creator');
}

// Puntuación general de un organizador
export async function getUserRating(userId: string): Promise<UserRating> {
  return apiFetch<UserRating>(`/reviews/user/${userId}/rating`);
}

// Responder una valoración (solo organizador del evento o admin)
export async function replyToReview(reviewId: string, reply: string): Promise<Review> {
  return apiFetch<Review>(`/reviews/${reviewId}/reply`, {
    method: 'PATCH',
    body: JSON.stringify({ reply }),
  });
}

// Eliminar una valoración (autor o admin)
export async function deleteReview(reviewId: string): Promise<void> {
  await apiFetch<void>(`/reviews/${reviewId}`, {
    method: 'DELETE',
  });
}

export interface AuthResponse {
  access_token?: string;
  token_type?: string;
  mfa_required?: boolean;
  mfa_token?: string;
}

// Login
export async function login(email: string, password: string, rememberMe: boolean = false): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, remember_me: rememberMe }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AuthResponse = await response.json();
  if (data.access_token) setToken(data.access_token);
  return data;
}

// Google Login
export async function googleLogin(credential: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credential }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AuthResponse = await response.json();
  if (data.access_token) setToken(data.access_token);
  return data;
}

// MFA: verificar código durante el login
export async function mfaVerify(mfaToken: string, code: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/mfa/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mfa_token: mfaToken, code }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data: AuthResponse = await response.json();
  if (data.access_token) setToken(data.access_token);
  return data;
}

export interface MfaSetupResponse {
  secret: string;
  otpauth_url: string;
  qr_data_uri: string;
}

export async function mfaSetup(): Promise<MfaSetupResponse> {
  return apiFetch<MfaSetupResponse>('/auth/mfa/setup', { method: 'POST' });
}

export async function mfaEnable(code: string, password?: string): Promise<{ message: string; recovery_codes: string[] }> {
  return apiFetch<{ message: string; recovery_codes: string[] }>('/auth/mfa/enable', {
    method: 'POST',
    body: JSON.stringify({ code, password: password || undefined }),
  });
}

export async function mfaDisable(password: string, code: string): Promise<{ message: string }> {
  const result = await apiFetch<{ message: string }>('/auth/mfa/disable', {
    method: 'POST',
    body: JSON.stringify({ password, code }),
  });
  removeToken();
  return result;
}

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  actor_uid: string | null;
  actor_email: string | null;
  target: string | null;
  ip: string | null;
  user_agent: string | null;
  success: boolean;
  metadata: Record<string, unknown>;
}

export async function getAuditLog(params: { limit?: number; action?: string; actor_uid?: string } = {}): Promise<AuditLogEntry[]> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.action) qs.set('action', params.action);
  if (params.actor_uid) qs.set('actor_uid', params.actor_uid);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<AuditLogEntry[]>(`/auth/audit${suffix}`);
}

// Send verification email
export async function sendVerification(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/send-verification', {
    method: 'POST',
  });
}

// Resend verification email
export async function resendVerification(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/auth/resend-verification?email=${encodeURIComponent(email)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status}`;
    try { const errorData = await response.json(); errorMessage = errorData.detail || errorMessage; } catch (e) {}
    throw new Error(errorMessage);
  }
  return response.json();
}

// Forgot password
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status}`;
    try { const errorData = await response.json(); errorMessage = errorData.detail || errorMessage; } catch (e) {}
    throw new Error(errorMessage);
  }
  return response.json();
}

// Reset password
export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status}`;
    try { const errorData = await response.json(); errorMessage = errorData.detail || errorMessage; } catch (e) {}
    throw new Error(errorMessage);
  }
  return response.json();
}

// Register
export async function register(email: string, password: string, display_name: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, display_name }),
  });
  
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
