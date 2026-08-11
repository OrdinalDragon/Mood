/**
 * src/lib/api.ts - Cliente HTTP para el Backend
 * Helper para hacer requests al API de FastAPI.
 */

import { Event, UserProfile, UserAdmin, Ad, Ban, Notification, Review, UserRating } from '../types';

// URL del API desde variables de entorno
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Obtener token del localStorage
function getToken(): string | null {
  return localStorage.getItem('token');
}

// Guardar token
export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

// Eliminar token
export function removeToken(): void {
  localStorage.removeItem('token');
}

// Fetch con headers de auth
async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Obtener eventos del backend
export async function getEvents(status: string = 'approved'): Promise<Event[]> {
  return apiFetch<Event[]>(`/events/?status_filter=${status}`);
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

// Subir imagen al servidor
export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/upload/`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload Error: ${response.status}`);
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

// Actualizar perfil de usuario (nombre y/o foto)
export async function updateProfile(data: { display_name?: string; photo_url?: string }): Promise<UserProfile> {
  return apiFetch<UserProfile>('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Cambiar contraseña
export async function changePassword(current_password: string, new_password: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  });
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

// Logout
export async function logout(): Promise<void> {
  removeToken();
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

// Login
export async function login(email: string, password: string, rememberMe: boolean = false): Promise<{ access_token: string }> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, remember_me: rememberMe }),
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
  
  const data = await response.json();
  setToken(data.access_token);
  return data;
}

// Google Login
export async function googleLogin(credential: string): Promise<{ access_token: string }> {
  const response = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credential }),
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

  const data = await response.json();
  setToken(data.access_token);
  return data;
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
