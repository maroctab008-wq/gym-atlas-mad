import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface SubscriptionNotification {
  id: string;
  memberId: string;
  memberName: string;
  plan: string;
  daysOverdue: number;
  endDate: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<SubscriptionNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const { data } = await api.get('/subscriptions/notifications');
    if (data) setNotifications(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;
  const markAllAsRead = () => setReadIds(new Set(notifications.map(n => n.id)));
  const markAsRead = (id: string) => setReadIds(prev => new Set(prev).add(id));
  const isRead = (id: string) => readIds.has(id);

  return { notifications, unreadCount, loading, markAllAsRead, markAsRead, isRead, refresh: fetchNotifications };
}
