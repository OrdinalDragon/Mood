/**
 * src/lib/api.ts - Cliente HTTP para el Backend
 * Helper para hacer requests al API de FastAPI.
 */

import { Event, UserProfile } from '../types';

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

// Obtener perfil de usuario (alias)
export async function getUserProfile(): Promise<UserProfile> {
  return getMe();
}

// Logout
export async function logout(): Promise<void> {
  removeToken();
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

// Register
export async function register(email: string, password: string, display_name: string): Promise<UserProfile> {
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
  
  // Luego hacer login automático
  await login(email, password);
  
  // Obtener perfil
  return getUserProfile();
}
