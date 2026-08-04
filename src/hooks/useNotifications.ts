/**
 * src/hooks/useNotifications.ts - Hook de Notificaciones
 * Poll del contador de no leídas y gestión del listado.
 */

import { useCallback, useEffect, useState } from 'react';
import { Notification } from '../types';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead as apiMarkNotificationRead,
  markAllNotificationsRead as apiMarkAllNotificationsRead,
} from '../lib/api';
import { useAuth } from './useAuth';

const POLL_INTERVAL = 30000;

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [list, count] = await Promise.all([getNotifications(), getUnreadCount()]);
      setNotifications(list);
      setUnreadCount(count.unread_count);
    } catch (e) {
      // Ignorar errores de red
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    refresh();

    const interval = setInterval(async () => {
      try {
        const count = await getUnreadCount();
        setUnreadCount(count.unread_count);
      } catch (e) {
        // Ignorar errores de red
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [user, refresh]);

  const markRead = useCallback(async (id: string) => {
    try {
      await apiMarkNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      // Ignorar errores de red
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await apiMarkAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      // Ignorar errores de red
    }
  }, []);

  return { notifications, unreadCount, markRead, markAllRead, refresh };
}
