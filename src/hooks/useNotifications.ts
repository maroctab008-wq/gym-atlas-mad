import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionNotification {
  id: string;
  memberId: string;
  memberName: string;
  plan: string;
  daysOverdue: number; // 0 = expires today, >0 = overdue
  endDate: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<SubscriptionNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const today = new Date();
    const graceEnd = new Date();
    graceEnd.setDate(today.getDate() - 7);

    // Fetch subscriptions that expired within the last 7 days or expire today
    const { data } = await supabase
      .from('subscriptions')
      .select('id, member_id, plan, end_date, status, members(full_name)')
      .lte('end_date', today.toISOString().split('T')[0])
      .gte('end_date', graceEnd.toISOString().split('T')[0])
      .neq('status', 'abandoned')
      .order('end_date', { ascending: true });

    if (data) {
      const notifs: SubscriptionNotification[] = data.map((sub: any) => {
        const endDate = new Date(sub.end_date);
        const diffTime = today.getTime() - endDate.getTime();
        const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        return {
          id: sub.id,
          memberId: sub.member_id,
          memberName: sub.members?.full_name ?? 'Membre inconnu',
          plan: sub.plan,
          daysOverdue,
          endDate: sub.end_date,
        };
      });
      setNotifications(notifs);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const markAllAsRead = () => {
    setReadIds(new Set(notifications.map(n => n.id)));
  };

  const markAsRead = (id: string) => {
    setReadIds(prev => new Set(prev).add(id));
  };

  const isRead = (id: string) => readIds.has(id);

  return { notifications, unreadCount, loading, markAllAsRead, markAsRead, isRead, refresh: fetchNotifications };
}
