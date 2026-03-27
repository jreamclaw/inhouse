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
  type: 'order' | 'chef';
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
      if (profile?.role === 'chef') {
        const { data, error } = await supabase
          .from('orders')
          .select('id, customer_name, status, created_at')
          .eq('chef_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        const chefNotifications: NotificationItem[] = ((data as any[]) || []).map((order) => ({
          id: order.id,
          title: `Order ${order.status}`,
          body: `${order.customer_name || 'A customer'} has an order in ${order.status} status.`,
          type: 'order',
        }));

        setNotifications(chefNotifications);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('id, status, created_at')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const customerNotifications: NotificationItem[] = ((data as any[]) || []).map((order) => ({
        id: order.id,
        title: 'Order update',
        body: `Your order is currently ${String(order.status).replaceAll('_', ' ')}.`,
        type: 'order',
      }));

      setNotifications(customerNotifications);
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

        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-700 text-foreground">Notifications are now connected to a real page</h2>
              <p className="text-sm text-muted-foreground mt-1">
                This fixes the 404 route. Live notification delivery can be upgraded next once order and social events are fully wired.
              </p>
            </div>
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
