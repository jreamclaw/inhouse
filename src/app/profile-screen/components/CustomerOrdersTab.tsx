'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingBag, Clock, MapPin, Package, Bike, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled';

interface DbOrderItem {
  meal_title: string;
  qty: number;
  unit_price: number;
}

interface DbChefProfile {
  full_name: string | null;
  avatar_url: string | null;
  location: string | null;
}

interface DbOrderRow {
  id: string;
  status: string;
  fulfillment_type: string;
  address: string | null;
  apt: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  instructions: string | null;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  total: number;
  created_at: string;
  chef_id: string;
  user_profiles?: DbChefProfile | DbChefProfile[] | null;
  order_items?: DbOrderItem[];
}

interface CustomerOrder {
  id: string;
  chefId: string;
  chefName: string;
  chefAvatar: string | null;
  chefLocation: string | null;
  status: OrderStatus;
  fulfillmentType: 'pickup' | 'delivery';
  destinationLabel: string;
  notes?: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  createdAt: string;
  items: DbOrderItem[];
}

const STATUS_UI: Record<OrderStatus, { label: string; tone: string }> = {
  pending: { label: 'Pending', tone: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' },
  accepted: { label: 'Accepted', tone: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800' },
  preparing: { label: 'Preparing', tone: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800' },
  ready: { label: 'Ready for pickup', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' },
  on_the_way: { label: 'On the way', tone: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' },
  delivered: { label: 'Delivered', tone: 'bg-muted text-foreground border-border' },
  cancelled: { label: 'Cancelled', tone: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800' },
};

function mapStatus(status: string): OrderStatus {
  if (status === 'confirmed') return 'accepted';
  if (status === 'out_for_delivery') return 'on_the_way';
  if (status === 'ready') return 'ready';
  if (status === 'accepted') return 'accepted';
  if (status === 'preparing') return 'preparing';
  if (status === 'on_the_way') return 'on_the_way';
  if (status === 'delivered') return 'delivered';
  if (status === 'cancelled') return 'cancelled';
  return 'pending';
}

function formatRelativeTime(dateString: string) {
  const ms = Date.now() - new Date(dateString).getTime();
  const mins = Math.max(1, Math.floor(ms / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function CustomerOrdersTab() {
  const { user } = useAuth();
  const supabase = createClient();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [user?.id]);

  const loadOrders = async () => {
    if (!user?.id) {
      setLoading(false);
      setOrders([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          fulfillment_type,
          address,
          apt,
          city,
          state,
          zip,
          instructions,
          subtotal,
          delivery_fee,
          service_fee,
          total,
          created_at,
          chef_id,
          user_profiles:chef_id (full_name, avatar_url, location),
          order_items (meal_title, qty, unit_price)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = ((data as DbOrderRow[] | null) ?? []).map((row) => {
        const chefProfile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
        const destination = row.fulfillment_type === 'delivery'
          ? [row.address, row.apt, row.city, row.state, row.zip].filter(Boolean).join(', ')
          : (chefProfile?.location || 'Chef pickup location');

        return {
          id: row.id,
          chefId: row.chef_id,
          chefName: chefProfile?.full_name || 'Chef',
          chefAvatar: chefProfile?.avatar_url || null,
          chefLocation: chefProfile?.location || null,
          status: mapStatus(row.status),
          fulfillmentType: row.fulfillment_type === 'pickup' ? 'pickup' : 'delivery',
          destinationLabel: destination,
          notes: row.instructions || undefined,
          subtotal: Number(row.subtotal),
          deliveryFee: Number(row.delivery_fee),
          serviceFee: Number(row.service_fee),
          total: Number(row.total),
          createdAt: row.created_at,
          items: row.order_items || [],
        } as CustomerOrder;
      });

      setOrders(mapped);
      setExpandedOrder(mapped[0]?.id || null);
    } catch {
      setOrders([]);
      setExpandedOrder(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading your orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-10 gap-0 text-center px-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">No orders yet</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
            Your placed orders will show up here with live status and pickup or delivery details.
          </p>
          <Link href="/nearby">
            <button className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-7 py-3 rounded-full shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all duration-150">
              <ShoppingBag className="w-4 h-4" />
              Explore Local Chefs
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {orders.map((order) => {
        const statusUi = STATUS_UI[order.status];
        const isExpanded = expandedOrder === order.id;

        return (
          <div key={order.id} className="rounded-2xl border border-border bg-card overflow-hidden">
            <button className="w-full text-left p-4" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-700 text-foreground">{order.chefName}</p>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-700 px-2 py-0.5 rounded-full border ${statusUi.tone}`}>
                      {order.status === 'delivered' ? <CheckCircle className="w-3 h-3" /> : order.status === 'on_the_way' ? <Bike className="w-3 h-3" /> : order.status === 'cancelled' ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {statusUi.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(order.createdAt)} · {order.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery'}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{order.destinationLabel}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-700 text-primary font-tabular">${order.total.toFixed(2)}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-border/60 space-y-3 pt-3">
                <div>
                  <p className="text-xs font-700 text-muted-foreground uppercase tracking-wide mb-2">Order items</p>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                        <p className="text-foreground"><span className="font-700 text-primary">{item.qty}×</span> {item.meal_title}</p>
                        <span className="font-tabular text-foreground">${(Number(item.unit_price) * item.qty).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
                  <div className="flex items-start gap-2 text-sm text-foreground">
                    {order.fulfillmentType === 'pickup' ? <Package className="w-4 h-4 text-primary mt-0.5" /> : <MapPin className="w-4 h-4 text-primary mt-0.5" />}
                    <div>
                      <p className="font-700">{order.fulfillmentType === 'pickup' ? 'Pickup location' : 'Delivery address'}</p>
                      <p className="text-muted-foreground mt-0.5">{order.destinationLabel || 'Location unavailable'}</p>
                    </div>
                  </div>
                  {order.notes && <p className="text-xs text-muted-foreground">Instructions: {order.notes}</p>}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-tabular">${order.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Delivery fee</span><span className="font-tabular">${order.deliveryFee.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Service fee</span><span className="font-tabular">${order.serviceFee.toFixed(2)}</span></div>
                  <div className="flex justify-between pt-1 border-t border-border"><span className="font-700 text-foreground">Total</span><span className="font-700 text-primary font-tabular">${order.total.toFixed(2)}</span></div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
