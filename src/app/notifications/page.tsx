'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ShoppingBag, ChefHat, ArrowLeft } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'order' | 'chef' | 'follow' | 'like' | 'tag';
}

const EMPTY_NOTIFICATIONS: NotificationItem[] = [];

export default function NotificationsPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [notifications, setNotifications] = useState<NotificationItem[]>(EMPTY_NOTIFICATIONS);

  useEffect(() => {
    loadNotifications();
  }, [user?.id, profile?.role]);

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25);

      if (error) throw error;

      setNotifications(((data as any[]) || []).map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        type: item.type,
      })));
    } catch {
      setNotifications(EMPTY_NOTIFICATIONS);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/home-feed" className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-700 text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">Updates from orders, chefs, and activity</p>
          </div>
        </div>

        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-700 text-foreground">No notifications yet</p>
              <p className="text-sm text-muted-foreground mt-1">New order updates and activity will show up here when they happen.</p>
            </div>
          ) : notifications.map((item) => (
            <div key={item.id} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                {item.type === 'order' ? (
                  <ShoppingBag className="w-5 h-5 text-foreground" />
                ) : item.type === 'follow' ? (
                  <ChefHat className="w-5 h-5 text-foreground" />
                ) : item.type === 'like' ? (
                  <Bell className="w-5 h-5 text-foreground" />
                ) : item.type === 'tag' ? (
                  <Bell className="w-5 h-5 text-foreground" />
                ) : (
                  <ChefHat className="w-5 h-5 text-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-700 text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
