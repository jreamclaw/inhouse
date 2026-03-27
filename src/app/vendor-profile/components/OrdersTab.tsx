'use client';

import React, { useEffect, useState } from 'react';
import {
  Clock,
  CheckCircle,
  ChefHat,
  Truck,
  Package,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Phone,
  MapPin,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  customizations?: string[];
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  placedAt: string;
  estimatedReady: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes?: string;
  isDelivery: boolean;
}

interface DbOrderItem {
  meal_title: string;
  qty: number;
  unit_price: number;
}

interface DbOrderRow {
  id: string;
  customer_name: string;
  customer_phone: string;
  address: string | null;
  apt: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  instructions: string | null;
  fulfillment_type: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  created_at: string;
  order_items?: DbOrderItem[];
}

const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-001',
    orderNumber: '#4821',
    customerName: 'Jordan Williams',
    customerPhone: '+1 (202) 555-0182',
    customerAddress: '1420 K St NW, Washington, DC 20005',
    placedAt: '2 min ago',
    estimatedReady: '35–45 min',
    status: 'pending',
    isDelivery: true,
    items: [
      { name: 'Truffle Tagliatelle', qty: 1, price: 38, customizations: ['Large portion', 'Extra Truffle Shavings +$6'] },
      { name: 'Burrata & Heirloom Tomato', qty: 1, price: 22, customizations: ['Focaccia +$3'] },
    ],
    subtotal: 69,
    deliveryFee: 4.99,
    total: 73.99,
    notes: 'Please leave at door. Nut allergy — no pine nuts.',
  },
  {
    id: 'ord-002',
    orderNumber: '#4820',
    customerName: 'Priya Nair',
    customerPhone: '+1 (202) 555-0247',
    customerAddress: '900 16th St NW, Washington, DC 20006',
    placedAt: '18 min ago',
    estimatedReady: '10–15 min',
    status: 'preparing',
    isDelivery: true,
    items: [
      { name: 'Osso Buco alla Milanese', qty: 2, price: 58, customizations: ['Saffron Risotto', 'Medium spice', 'House Red Wine +$9'] },
      { name: 'Tiramisu Classico', qty: 2, price: 16 },
    ],
    subtotal: 166,
    deliveryFee: 4.99,
    total: 170.99,
  },
  {
    id: 'ord-003',
    orderNumber: '#4819',
    customerName: 'Marcus Thompson',
    customerPhone: '+1 (202) 555-0391',
    customerAddress: '1600 Pennsylvania Ave NW, Washington, DC 20500',
    placedAt: '32 min ago',
    estimatedReady: 'Ready now',
    status: 'ready',
    isDelivery: false,
    items: [
      { name: 'Cacio e Pepe', qty: 1, price: 28, customizations: ['Large portion +$6', 'Extra Pecorino +$2'] },
    ],
    subtotal: 36,
    deliveryFee: 0,
    total: 36,
    notes: 'Pickup order',
  },
  {
    id: 'ord-004',
    orderNumber: '#4818',
    customerName: 'Sofia Reyes',
    customerPhone: '+1 (202) 555-0158',
    customerAddress: '1100 New York Ave NW, Washington, DC 20005',
    placedAt: '55 min ago',
    estimatedReady: 'Delivered',
    status: 'delivered',
    isDelivery: true,
    items: [
      { name: 'Truffle Tagliatelle', qty: 1, price: 38 },
      { name: 'Tiramisu Classico', qty: 1, price: 16 },
    ],
    subtotal: 54,
    deliveryFee: 4.99,
    total: 58.99,
  },
  {
    id: 'ord-005',
    orderNumber: '#4817',
    customerName: 'Devon Carter',
    customerPhone: '+1 (202) 555-0274',
    customerAddress: '700 14th St NW, Washington, DC 20005',
    placedAt: '1 hr ago',
    estimatedReady: 'Delivered',
    status: 'on_the_way',
    isDelivery: true,
    items: [
      { name: 'Osso Buco alla Milanese', qty: 1, price: 58, customizations: ['Polenta', 'Mild spice'] },
      { name: 'Burrata & Heirloom Tomato', qty: 1, price: 22 },
    ],
    subtotal: 80,
    deliveryFee: 4.99,
    total: 84.99,
  },
];

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ReactNode; step: number }> = {
  pending: {
    label: 'Pending',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: <AlertCircle className="w-4 h-4" />,
    step: 0,
  },
  accepted: {
    label: 'Accepted',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
    icon: <CheckCircle className="w-4 h-4" />,
    step: 1,
  },
  preparing: {
    label: 'Preparing',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    icon: <ChefHat className="w-4 h-4" />,
    step: 2,
  },
  ready: {
    label: 'Ready for Pickup',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    icon: <Package className="w-4 h-4" />,
    step: 3,
  },
  on_the_way: {
    label: 'On the Way',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    icon: <Truck className="w-4 h-4" />,
    step: 4,
  },
  delivered: {
    label: 'Delivered',
    color: 'text-muted-foreground',
    bg: 'bg-muted/50 border-border',
    icon: <CheckCircle className="w-4 h-4" />,
    step: 5,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: <AlertCircle className="w-4 h-4" />,
    step: -1,
  },
};

const FULFILLMENT_STEPS = [
  { key: 'accepted', label: 'Accepted', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  { key: 'preparing', label: 'Preparing', icon: <ChefHat className="w-3.5 h-3.5" /> },
  { key: 'ready', label: 'Ready', icon: <Package className="w-3.5 h-3.5" /> },
  { key: 'on_the_way', label: 'On the way', icon: <Truck className="w-3.5 h-3.5" /> },
  { key: 'delivered', label: 'Delivered', icon: <CheckCircle className="w-3.5 h-3.5" /> },
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'on_the_way',
  on_the_way: 'delivered',
};

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: 'Accept Order',
  accepted: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Mark On the Way',
  on_the_way: 'Mark Delivered',
};

type FilterTab = 'active' | 'completed';

function formatRelativeTime(dateString: string) {
  const ms = Date.now() - new Date(dateString).getTime();
  const mins = Math.max(1, Math.floor(ms / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function mapDbStatus(status: string): OrderStatus {
  switch (status) {
    case 'pending': return 'pending';
    case 'accepted': return 'accepted';
    case 'confirmed': return 'accepted';
    case 'preparing': return 'preparing';
    case 'ready': return 'ready';
    case 'on_the_way': return 'on_the_way';
    case 'out_for_delivery': return 'on_the_way';
    case 'delivered': return 'delivered';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

export default function OrdersTab() {
  const { user } = useAuth();
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [useMockFallback, setUseMockFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('active');

  useEffect(() => {
    loadOrders();
  }, [user?.id]);

  const loadOrders = async () => {
    if (!user?.id) {
      setLoading(false);
      setUseMockFallback(false);
      setLoadError('');
      return;
    }

    setLoading(true);
    setLoadError('');
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          customer_name,
          customer_phone,
          address,
          apt,
          city,
          state,
          zip,
          instructions,
          fulfillment_type,
          subtotal,
          delivery_fee,
          total,
          status,
          created_at,
          order_items (meal_title, qty, unit_price)
        `)
        .eq('chef_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = ((data as DbOrderRow[] | null) || []).map((row, index) => ({
        id: row.id,
        orderNumber: `#${String(index + 1).padStart(4, '0')}`,
        customerName: row.customer_name || 'Customer',
        customerPhone: row.customer_phone || 'No phone provided',
        customerAddress: [row.address, row.apt, row.city, row.state, row.zip].filter(Boolean).join(', '),
        placedAt: formatRelativeTime(row.created_at),
        estimatedReady: row.fulfillment_type === 'pickup' ? 'Pickup order' : 'Delivery order',
        status: mapDbStatus(row.status),
        items: (row.order_items || []).map((item) => ({
          name: item.meal_title,
          qty: item.qty,
          price: Number(item.unit_price),
        })),
        subtotal: Number(row.subtotal),
        deliveryFee: Number(row.delivery_fee),
        total: Number(row.total),
        notes: row.instructions || undefined,
        isDelivery: row.fulfillment_type === 'delivery',
      }));

      if (mapped.length > 0) {
        setOrders(mapped);
        setUseMockFallback(false);
        setExpandedOrder(mapped[0].id);
      } else {
        setOrders([]);
        setUseMockFallback(false);
        setExpandedOrder(null);
      }
    } catch {
      setOrders([]);
      setUseMockFallback(false);
      setLoadError('Could not load orders right now.');
      setExpandedOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));
  const displayedOrders = filterTab === 'active' ? activeOrders : completedOrders;

  const advanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: next } : o));

    if (!useMockFallback) {
      await supabase.from('orders').update({ status: next }).eq('id', orderId);
      await supabase.from('order_revenue').update({ status: next }).eq('order_id', orderId);
    }
  };

  const cancelOrder = async (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));

    if (!useMockFallback) {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
      await supabase.from('order_revenue').update({ status: 'cancelled' }).eq('order_id', orderId);
    }
  };

  return (
    <div className="pb-8">
      {/* Summary bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-card border border-border/60 rounded-2xl p-4 mb-3 shadow-sm shadow-black/[0.03]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-700 text-foreground">Vendor orders</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {loading
                  ? 'Loading order activity...'
                  : loadError
                    ? loadError
                    : 'Showing real customer orders from your InHouse account.'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Pending payout</p>
              <p className="text-base font-700 text-foreground font-tabular">
                ${orders.filter((o) => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 px-4 pt-0 pb-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-800">
          <p className="text-xl font-700 text-blue-600 dark:text-blue-400 font-tabular">
            {orders.filter(o => o.status === 'pending').length}
          </p>
          <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 font-500 mt-0.5">Pending</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center border border-amber-100 dark:border-amber-800">
          <p className="text-xl font-700 text-amber-600 dark:text-amber-400 font-tabular">
            {orders.filter(o => o.status === 'preparing').length}
          </p>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-500 mt-0.5">Preparing</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-800">
          <p className="text-xl font-700 text-emerald-600 dark:text-emerald-400 font-tabular">
            {orders.filter(o => o.status === 'delivered').length}
          </p>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-500 mt-0.5">Delivered</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mx-4 mb-3 bg-muted rounded-xl p-1">
        <button
          onClick={() => setFilterTab('active')}
          className={`flex-1 py-2 rounded-lg text-sm font-600 transition-all ${
            filterTab === 'active' ?'bg-card text-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
          }`}
        >
          Active
          {activeOrders.length > 0 && (
            <span className={`ml-1.5 text-[10px] font-700 px-1.5 py-0.5 rounded-full ${
              filterTab === 'active' ? 'bg-primary text-white' : 'bg-muted-foreground/20 text-muted-foreground'
            }`}>
              {activeOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilterTab('completed')}
          className={`flex-1 py-2 rounded-lg text-sm font-600 transition-all ${
            filterTab === 'completed'
              ? 'bg-card text-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
          }`}
        >
          Completed
          {completedOrders.length > 0 && (
            <span className={`ml-1.5 text-[10px] font-700 px-1.5 py-0.5 rounded-full ${
              filterTab === 'completed' ? 'bg-primary text-white' : 'bg-muted-foreground/20 text-muted-foreground'
            }`}>
              {completedOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Orders list */}
      {displayedOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-base font-600 text-foreground">No {filterTab} orders</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filterTab === 'active' ? 'New orders will appear here.' : 'Completed orders will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 px-4">
          {displayedOrders.map((order) => {
            const cfg = STATUS_CONFIG[order.status];
            const isExpanded = expandedOrder === order.id;
            const nextLabel = NEXT_STATUS_LABEL[order.status];
            const isActive = !['delivered', 'cancelled'].includes(order.status);

            return (
              <div
                key={order.id}
                className={`rounded-2xl border overflow-hidden ${cfg.bg}`}
              >
                {/* Order header */}
                <button
                  className="w-full text-left px-4 pt-4 pb-3"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-700 text-foreground">{order.orderNumber}</span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-600 px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20 ${cfg.color}`}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-500 text-foreground mt-0.5">{order.customerName}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {order.placedAt}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {order.items.reduce((s, i) => s + i.qty, 0)} item{order.items.reduce((s, i) => s + i.qty, 0) !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs font-700 text-foreground font-tabular">${order.total.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className={`mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-0' : ''}`}>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      }
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-white/30 dark:border-white/10 pt-3">

                    {/* Fulfillment tracker */}
                    {order.status !== 'cancelled' && (
                      <div>
                        <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">Fulfillment</p>
                        <div className="flex items-center gap-0">
                          {FULFILLMENT_STEPS.map((step, idx) => {
                            const stepCfg = STATUS_CONFIG[step.key as OrderStatus];
                            const currentStep = STATUS_CONFIG[order.status].step;
                            const isDone = currentStep > stepCfg.step;
                            const isCurrent = currentStep === stepCfg.step;
                            const isLast = idx === FULFILLMENT_STEPS.length - 1;

                            return (
                              <React.Fragment key={step.key}>
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                                    isDone
                                      ? 'bg-primary border-primary text-white'
                                      : isCurrent
                                        ? 'bg-white dark:bg-card border-primary text-primary' :'bg-white/50 dark:bg-card/50 border-border text-muted-foreground'
                                  }`}>
                                    {step.icon}
                                  </div>
                                  <span className={`text-[9px] font-500 text-center leading-tight max-w-[44px] ${
                                    isDone || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                                  }`}>
                                    {step.label}
                                  </span>
                                </div>
                                {!isLast && (
                                  <div className={`flex-1 h-0.5 mb-4 mx-0.5 rounded-full transition-all ${
                                    isDone ? 'bg-primary' : 'bg-border'
                                  }`} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Order items */}
                    <div>
                      <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">Order Details</p>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-600 text-foreground">
                                <span className="font-700 text-primary font-tabular">{item.qty}×</span> {item.name}
                              </p>
                              {item.customizations && item.customizations.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                  {item.customizations.join(' · ')}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-600 text-foreground font-tabular shrink-0">
                              ${(item.price * item.qty).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Price breakdown */}
                      <div className="mt-3 pt-3 border-t border-white/30 dark:border-white/10 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Subtotal</span>
                          <span className="font-tabular">${order.subtotal.toFixed(2)}</span>
                        </div>
                        {order.isDelivery && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Delivery fee</span>
                            <span className="font-tabular">${order.deliveryFee.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-700 text-foreground pt-1">
                          <span>Total</span>
                          <span className="font-tabular">${order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer info */}
                    <div>
                      <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">Customer</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{order.customerPhone}</span>
                        </div>
                        {order.isDelivery && (
                          <div className="flex items-start gap-2 text-sm text-foreground">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <span className="leading-snug">{order.customerAddress}</span>
                          </div>
                        )}
                        {!order.isDelivery && (
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>Pickup order</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Special notes */}
                    {order.notes && (
                      <div className="bg-white/50 dark:bg-black/10 rounded-xl px-3 py-2.5">
                        <p className="text-xs font-600 text-muted-foreground mb-1">Special Instructions</p>
                        <p className="text-sm text-foreground leading-relaxed">{order.notes}</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    {isActive && (
                      <div className="flex gap-2 pt-1">
                        {nextLabel && (
                          <button
                            onClick={() => advanceStatus(order.id, order.status)}
                            className="flex-1 bg-primary text-white text-sm font-600 py-2.5 rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20"
                          >
                            {nextLabel}
                          </button>
                        )}
                        {order.status === 'pending' && (
                          <button
                            onClick={() => cancelOrder(order.id)}
                            className="px-4 bg-white/60 dark:bg-black/20 text-red-600 dark:text-red-400 text-sm font-600 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-[0.98] transition-all border border-red-200 dark:border-red-800"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
