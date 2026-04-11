'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  MapPin,
  CreditCard,
  CheckCircle,
  Clock,
  ChefHat,
  Minus,
  Plus,
  Trash2,
  Star,
  Loader2,
  AlertCircle,
  Package,
  Bike,
  Home,
  Navigation,
} from 'lucide-react';
import { toast } from 'sonner';
import ReviewModal from './ReviewModal';
import { CheckoutCartSkeleton, CheckoutDeliverySkeleton, CheckoutPaymentSkeleton } from '@/components/ui/SkeletonLoaders';

type CartItem = {
  id: string;
  mealId: string;
  title: string;
  description: string;
  price: number;
  qty: number;
  image: string;
  imageAlt: string;
  chef: {
    id: string;
    name: string;
    avatar: string;
    rating: number;
    location?: string;
    deliveryFee?: number;
  };
};

type PersistedCheckoutCartItem = {
  id: string;
  mealId: string | null;
  title: string;
  description: string;
  price: number;
  qty: number;
  image: string;
  imageAlt: string;
  notes?: string;
  chef?: {
    id: string | null;
    name?: string;
    avatar?: string;
    rating?: number;
    location?: string;
    deliveryFee?: number;
  };
};

type DeliveryFormData = {
  fullName: string;
  phone: string;
  address: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  deliveryTime: string;
  instructions: string;
};

type PaymentFormData = {
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  saveCard: boolean;
};

type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'on_the_way' | 'delivered';

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface DbCustomerProfile {
  full_name: string | null;
  phone?: string | null;
  location: string | null;
}

interface DbChefProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  location: string | null;
  delivery_fee?: number | null;
}

const ORDER_STEPS: { status: OrderStatus; label: string; icon: React.ElementType; time?: string }[] = [
  { status: 'pending', label: 'Order Placed', icon: ShoppingBag, time: 'Just now' },
  { status: 'accepted', label: 'Chef Accepted', icon: ChefHat, time: '' },
  { status: 'preparing', label: 'Preparing Your Meal', icon: Package, time: '' },
  { status: 'ready', label: 'Ready for Pickup', icon: Package, time: '' },
  { status: 'on_the_way', label: 'On the Way', icon: Bike, time: '' },
  { status: 'delivered', label: 'Delivered', icon: Home, time: '' },
];

const STATUS_ORDER: OrderStatus[] = ['pending', 'accepted', 'preparing', 'ready', 'on_the_way', 'delivered'];
const DEFAULT_VENDOR_DELIVERY_FEE = 0;

export default function CheckoutFlow() {
  const supabase = createClient();
  const { user, profile } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('delivery');
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isStepTransitioning, setIsStepTransitioning] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('pending');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'card' | 'apple' | 'google'>('card');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [chefProfile, setChefProfile] = useState<DbChefProfile | null>(null);
  const [customerOrderPlaced, setCustomerOrderPlaced] = useState(false);

  const deliveryForm = useForm<DeliveryFormData>({
    defaultValues: {
      fullName: '',
      phone: '',
      address: '',
      apt: '',
      city: '',
      state: '',
      zip: '',
      deliveryTime: 'asap',
      instructions: '',
    },
  });

  const paymentForm = useForm<PaymentFormData>({
    defaultValues: {
      cardName: '',
      cardNumber: '',
      expiry: '',
      cvv: '',
      saveCard: false,
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = window.localStorage.getItem('inhouse_checkout_cart');
      if (!saved) return;

      const parsed = JSON.parse(saved) as PersistedCheckoutCartItem[];
      if (!Array.isArray(parsed) || parsed.length === 0) return;

      const vendorLocation = window.localStorage.getItem('inhouse_vendor_location') || undefined;
      const vendorDeliveryFeeRaw = window.localStorage.getItem('inhouse_vendor_delivery_fee');
      const vendorDeliveryFee = vendorDeliveryFeeRaw ? Number(vendorDeliveryFeeRaw) : undefined;

      const mapped: CartItem[] = parsed.map((item) => ({
        id: item.id,
        mealId: item.mealId || item.id,
        title: item.title,
        description: item.description || '',
        price: Number(item.price),
        qty: Number(item.qty),
        image: item.image,
        imageAlt: item.imageAlt,
        chef: {
          id: item.chef?.id || '',
          name: item.chef?.name || 'Chef',
          avatar: item.chef?.avatar || item.image,
          rating: item.chef?.rating || 5,
          location: item.chef?.location || vendorLocation,
          deliveryFee: item.chef?.deliveryFee ?? vendorDeliveryFee,
        },
      }));

      setCart(mapped);
    } catch {
      setCart([]);
    }
  }, []);

  useEffect(() => {
    hydrateCheckoutProfileData();
  }, [user?.id, cart[0]?.chef?.id, profile?.id]);

  const hydrateCheckoutProfileData = async () => {
    if (!user?.id) return;

    try {
      const customerPromise = supabase
        .from('user_profiles')
        .select('full_name, phone, location')
        .eq('id', user.id)
        .maybeSingle();

      const chefId = cart[0]?.chef?.id;
      const chefPromise = chefId
        ? supabase
            .from('user_profiles')
            .select('id, full_name, avatar_url, location, delivery_fee')
            .eq('id', chefId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as any);

      const [customerResp, chefResp] = await Promise.all([customerPromise, chefPromise]);

      const customer = customerResp.data as DbCustomerProfile | null;
      const chef = chefResp.data as DbChefProfile | null;

      if (customer) {
        if (customer.full_name) deliveryForm.setValue('fullName', customer.full_name);
        if (customer.phone) deliveryForm.setValue('phone', customer.phone);

        const savedLocation = customer.location || '';
        const parts = savedLocation.split(',').map((part) => part.trim()).filter(Boolean);
        if (parts.length >= 3) {
          deliveryForm.setValue('address', parts[0] || '');
          deliveryForm.setValue('city', parts[1] || '');
          const stateZip = (parts[2] || '').split(' ').filter(Boolean);
          deliveryForm.setValue('state', stateZip[0] || '');
          deliveryForm.setValue('zip', stateZip.slice(1).join(' ') || '');
          setSavedAddresses([{ id: 'profile-location', label: 'Saved Address', address: parts[0] || '', city: parts[1] || '', state: stateZip[0] || '', zip: stateZip.slice(1).join(' ') || '' }]);
        }
      }

      if (chef) setChefProfile(chef);
    } catch {
      // silent; fallback UI still works
    }
  };

  const vendorDeliveryFee = useMemo(() => {
    const fromChefProfile = Number(chefProfile?.delivery_fee ?? NaN);
    if (!Number.isNaN(fromChefProfile)) return fromChefProfile;
    const fromCart = Number(cart[0]?.chef?.deliveryFee ?? NaN);
    if (!Number.isNaN(fromCart)) return fromCart;
    return DEFAULT_VENDOR_DELIVERY_FEE;
  }, [chefProfile, cart]);

  const pickupLocationLabel = useMemo(() => {
    return chefProfile?.location || cart[0]?.chef?.location || 'Chef pickup location not set';
  }, [chefProfile, cart]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = fulfillment === 'delivery' && subtotal > 0 ? vendorDeliveryFee : 0;
  const serviceFee = subtotal > 0 ? +(subtotal * 0.05).toFixed(2) : 0;
  const promoDiscount = promoApplied ? -8.0 : 0;
  const total = +(subtotal + deliveryFee + serviceFee + promoDiscount).toFixed(2);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const PLATFORM_FEE_RATE = 0.15;
  const platformFee = +(subtotal * PLATFORM_FEE_RATE).toFixed(2);
  const chefEarnings = +(subtotal * (1 - PLATFORM_FEE_RATE)).toFixed(2);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const newQty = item.qty + delta;
      return newQty > 0 ? { ...item, qty: newQty } : item;
    }).filter((item) => !(item.id === id && item.qty + delta <= 0)));
  }, []);

  const removeItem = useCallback((id: string, title: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    toast.success(`${title} removed from cart`);
  }, []);

  const applyPromo = () => {
    if (promoCode.toLowerCase() === 'inhouse10') {
      setPromoApplied(true);
      toast.success('Promo code applied! $8.00 off your order 🎉');
    } else {
      toast.error('Invalid promo code. Try INHOUSE10 for $8 off.');
    }
  };

  const startOrderStatusSubscription = (createdOrderId: string) => {
    const channel = supabase
      .channel(`order-status-${createdOrderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${createdOrderId}` }, (payload: any) => {
        const nextStatus = (payload.new?.status || 'pending') as OrderStatus;
        if (STATUS_ORDER.includes(nextStatus)) setOrderStatus(nextStatus);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const handlePlaceOrder = async () => {
    if (!user?.id) {
      toast.error('Please sign in before placing an order.');
      return;
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    setIsPlacingOrder(true);

    try {
      const deliveryValues = deliveryForm.getValues();
      const chefId = cart[0]?.chef?.id;

      if (!chefId) throw new Error('Chef information is missing for this order.');
      if (fulfillment === 'delivery' && (!deliveryValues.address || !deliveryValues.city || !deliveryValues.state || !deliveryValues.zip)) {
        throw new Error('Delivery address is incomplete.');
      }

      const { data: orderRow, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          chef_id: chefId,
          status: 'pending',
          fulfillment_type: fulfillment,
          customer_name: deliveryValues.fullName || profile?.full_name || '',
          customer_phone: deliveryValues.phone || '',
          address: fulfillment === 'delivery' ? deliveryValues.address || null : null,
          apt: fulfillment === 'delivery' ? deliveryValues.apt || null : null,
          city: fulfillment === 'delivery' ? deliveryValues.city || null : null,
          state: fulfillment === 'delivery' ? deliveryValues.state || null : null,
          zip: fulfillment === 'delivery' ? deliveryValues.zip || null : null,
          instructions: deliveryValues.instructions || null,
          delivery_time: deliveryValues.deliveryTime || null,
          subtotal,
          delivery_fee: deliveryFee,
          service_fee: serviceFee,
          promo_discount: Math.abs(promoDiscount),
          total,
        })
        .select('id, status')
        .single();

      if (orderError || !orderRow?.id) throw orderError || new Error('Could not create order.');

      const orderItemsPayload = cart.map((item) => ({
        order_id: orderRow.id,
        meal_id: item.mealId || null,
        meal_title: item.title,
        meal_description: item.description,
        meal_image_url: item.image,
        unit_price: item.price,
        qty: item.qty,
        line_total: +(item.price * item.qty).toFixed(2),
        customizations: [],
        notes: null,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);
      if (itemsError) throw itemsError;

      const { error: revenueError } = await supabase
        .from('order_revenue')
        .insert({
          order_id: orderRow.id,
          user_id: user.id,
          chef_id: chefId,
          subtotal,
          delivery_fee: deliveryFee,
          service_fee: serviceFee,
          platform_fee_rate: PLATFORM_FEE_RATE,
          platform_fee: platformFee,
          chef_earnings: chefEarnings,
          total,
          promo_discount: Math.abs(promoDiscount),
          status: 'pending',
        });

      if (revenueError) throw revenueError;

      const { data: chefSettings } = await supabase
        .from('user_settings')
        .select('notif_order_updates')
        .eq('user_id', chefId)
        .maybeSingle();

      if ((chefSettings as any)?.notif_order_updates !== false) {
        await supabase.from('notifications').insert({
          user_id: chefId,
          actor_id: user.id,
          type: 'order',
          title: 'New order received',
          body: `${deliveryValues.fullName || profile?.full_name || 'A customer'} placed a new order.`,
          entity_id: orderRow.id,
          entity_type: 'order',
        });
      }

      setOrderId(orderRow.id);
      setOrderStatus('pending');
      setCustomerOrderPlaced(true);
      setStep(4);
      startOrderStatusSubscription(orderRow.id);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('inhouse_checkout_cart');
      }

      toast.success('Order placed successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to place order.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const STEPS = [
    { num: 1, label: 'Cart' },
    { num: 2, label: 'Delivery' },
    { num: 3, label: 'Payment' },
    { num: 4, label: 'Confirm' },
  ];

  const currentStatusIndex = STATUS_ORDER.indexOf(orderStatus);
  const primaryChef = {
    id: chefProfile?.id || cart[0]?.chef?.id || '',
    name: chefProfile?.full_name || cart[0]?.chef?.name || 'InHouse Chef',
    avatar: chefProfile?.avatar_url || cart[0]?.chef?.avatar || '/assets/images/no_image.png',
    rating: cart[0]?.chef?.rating || 5,
    location: pickupLocationLabel,
  };

  const goToStep = (nextStep: 1 | 2 | 3 | 4) => {
    setIsStepTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsStepTransitioning(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-background">
      {step < 4 && (
        <div className="sticky top-14 z-30 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            {step > 1 ? (
              <button onClick={() => goToStep((step - 1) as 1 | 2 | 3 | 4)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-95" aria-label="Go back">
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
            ) : (
              <Link href="/home-feed">
                <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors" aria-label="Back to feed">
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
              </Link>
            )}
            <h1 className="text-lg font-700 text-foreground">
              {step === 1 ? 'Your Cart' : step === 2 ? (fulfillment === 'pickup' ? 'Pickup Details' : 'Delivery Details') : 'Payment'}
            </h1>
            {step === 1 && cartCount > 0 && <span className="ml-auto text-sm text-muted-foreground font-tabular">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>}
          </div>

          <div className="flex items-center gap-1">
            {STEPS.slice(0, 3).map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-700 transition-all ${step > s.num ? 'bg-primary text-white' : step === s.num ? 'bg-primary text-white ring-2 ring-primary/30' : 'bg-muted text-muted-foreground'}`}>
                    {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`text-xs font-500 hidden sm:inline ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
                </div>
                {idx < 2 && <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${step > s.num ? 'bg-primary' : 'bg-muted'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {isStepTransitioning && step < 4 && (
        <div className="fade-in">
          {step === 1 && <CheckoutDeliverySkeleton />}
          {step === 2 && <CheckoutPaymentSkeleton />}
          {step === 3 && <CheckoutCartSkeleton />}
        </div>
      )}

      {!isStepTransitioning && step === 1 && (
        <div className="fade-in">
          <div className="mx-4 mt-4">
            <div className="relative flex bg-muted rounded-2xl p-1 overflow-hidden">
              <div className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 ease-in-out shadow-sm" style={{ backgroundColor: '#FFA500', left: fulfillment === 'pickup' ? '4px' : 'calc(50%)' }} />
              <button type="button" onClick={() => setFulfillment('pickup')} className="relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-600 transition-colors duration-300" style={{ color: fulfillment === 'pickup' ? '#ffffff' : undefined }}>
                <ChefHat className={`w-4 h-4 transition-colors duration-300 ${fulfillment === 'pickup' ? 'text-white' : 'text-muted-foreground'}`} />
                <span className={fulfillment === 'pickup' ? 'text-white' : 'text-muted-foreground'}>Pickup</span>
              </button>
              <button type="button" onClick={() => setFulfillment('delivery')} className="relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-600 transition-colors duration-300">
                <Bike className={`w-4 h-4 transition-colors duration-300 ${fulfillment === 'delivery' ? 'text-white' : 'text-muted-foreground'}`} />
                <span className={fulfillment === 'delivery' ? 'text-white' : 'text-muted-foreground'}>Delivery</span>
              </button>
            </div>

            {fulfillment === 'pickup' && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-border transition-all duration-300 fade-in">
                <div className="relative h-36 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950/30 dark:to-teal-900/30 flex items-center justify-center">
                  <div className="relative flex flex-col items-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#FFA500' }}>
                      <MapPin className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="bg-card px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFA50020' }}>
                      <Navigation className="w-4 h-4" style={{ color: '#FFA500' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-700 text-foreground">{primaryChef.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{pickupLocationLabel}</p>
                    </div>
                  </div>
                  {pickupLocationLabel && pickupLocationLabel !== 'Chef pickup location not set' && (
                    <button className="text-xs font-600 px-3 py-1.5 rounded-full border transition-all active:scale-95" style={{ borderColor: '#FFA500', color: '#FFA500' }} onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(pickupLocationLabel)}`, '_blank')}>
                      Directions
                    </button>
                  )}
                </div>
                <div className="bg-muted/40 px-4 py-2 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Pickup happens at <span className="font-600 text-foreground">{pickupLocationLabel}</span></span>
                </div>
              </div>
            )}

            {fulfillment === 'delivery' && savedAddresses.length > 0 && (
              <div className="mt-3 space-y-2 transition-all duration-300 fade-in">
                <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide px-0.5">Deliver to</p>
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      setSelectedSavedAddress(addr.id);
                      deliveryForm.setValue('address', addr.address);
                      deliveryForm.setValue('city', addr.city);
                      deliveryForm.setValue('state', addr.state);
                      deliveryForm.setValue('zip', addr.zip);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 active:scale-[0.98] text-left"
                    style={{ borderColor: selectedSavedAddress === addr.id ? '#FFA500' : undefined, backgroundColor: selectedSavedAddress === addr.id ? '#FFA50010' : undefined }}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${selectedSavedAddress === addr.id ? '' : 'bg-muted'}`} style={{ backgroundColor: selectedSavedAddress === addr.id ? '#FFA500' : undefined }}>
                      <MapPin className={`w-4 h-4 ${selectedSavedAddress === addr.id ? 'text-white' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-700 text-foreground">{addr.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{addr.address}, {addr.city}, {addr.state} {addr.zip}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4"><ShoppingBag className="w-10 h-10 text-muted-foreground" /></div>
              <h2 className="text-xl font-700 text-foreground mb-2">Your cart is empty</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">Discover personal chefs near you and add their delicious meals to your cart.</p>
              <Link href="/home-feed"><button className="bg-primary text-white font-600 px-6 py-3 rounded-full hover:bg-primary/90 active:scale-95 transition-all duration-150">Browse Chefs</button></Link>
            </div>
          ) : (
            <>
              <div className="mx-4 mt-4 p-3 bg-accent rounded-2xl flex items-center gap-3">
                <Link href={primaryChef.id ? `/vendor-profile?id=${primaryChef.id}` : '/nearby'}>
                  <img src={primaryChef.avatar} alt={`${primaryChef.name} chef avatar`} className="w-10 h-10 rounded-full object-cover border-2 border-primary/20 hover:opacity-80 transition-opacity" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={primaryChef.id ? `/vendor-profile?id=${primaryChef.id}` : '/nearby'}><p className="text-sm font-700 text-foreground hover:text-primary transition-colors">{primaryChef.name}</p></Link>
                  <div className="flex items-center gap-1 flex-wrap">
                    <ChefHat className="w-3 h-3 text-primary" />
                    <span className="text-xs text-muted-foreground">Personal Chef</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <MapPin className="w-3 h-3 text-primary" />
                    <span className="text-xs text-muted-foreground truncate max-w-[180px]">{pickupLocationLabel}</span>
                  </div>
                </div>
              </div>

              <div className="px-4 mt-3 space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-3 p-3 bg-card rounded-2xl border border-border">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-muted"><img src={item.image} alt={item.imageAlt} className="w-full h-full object-cover" loading="lazy" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-700 text-foreground truncate">{item.title}</h3>
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        </div>
                        <button onClick={() => removeItem(item.id, item.title)} className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-destructive/10 hover:scale-110 transition-all duration-150" aria-label={`Remove ${item.title} from cart`}>
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-base font-700 text-primary font-tabular">${(item.price * item.qty).toFixed(2)}</span>
                        <div className="flex items-center gap-2 bg-muted rounded-full px-1 py-0.5">
                          <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-border hover:scale-110 transition-all duration-150 active:scale-95"><Minus className="w-3.5 h-3.5 text-foreground" /></button>
                          <span className="text-sm font-700 text-foreground font-tabular w-4 text-center">{item.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 hover:scale-110 transition-all duration-150 active:scale-95"><Plus className="w-3.5 h-3.5 text-white" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mx-4 mt-4">
                <div className="flex gap-2">
                  <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Promo code (try INHOUSE10)" className="flex-1 bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                  <button onClick={applyPromo} disabled={promoApplied || !promoCode} className={`px-4 py-3 rounded-xl text-sm font-600 transition-all duration-150 active:scale-95 ${promoApplied ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'}`}>{promoApplied ? '✓ Applied' : 'Apply'}</button>
                </div>
              </div>

              <div className="mx-4 mt-4 p-4 bg-muted/50 rounded-2xl space-y-2">
                <h3 className="text-sm font-700 text-foreground mb-3">Order Summary</h3>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-500 text-foreground font-tabular">${subtotal.toFixed(2)}</span></div>
                {fulfillment === 'delivery' ? (
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery fee</span><span className="font-500 text-foreground font-tabular">${deliveryFee.toFixed(2)}</span></div>
                ) : (
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pickup</span><span className="font-600 text-emerald-600 dark:text-emerald-400">Free</span></div>
                )}
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Service fee (5%)</span><span className="font-500 text-foreground font-tabular">${serviceFee.toFixed(2)}</span></div>
                {promoApplied && <div className="flex justify-between text-sm"><span className="text-green-600 dark:text-green-400">Promo (INHOUSE10)</span><span className="font-600 text-green-600 dark:text-green-400 font-tabular">−$8.00</span></div>}
                <div className="border-t border-border pt-2 mt-2 flex justify-between"><span className="text-base font-700 text-foreground">Total</span><span className="text-base font-700 text-primary font-tabular">${total.toFixed(2)}</span></div>
              </div>

              <div className="px-4 py-4 pb-8">
                <button onClick={() => goToStep(2)} className="w-full bg-primary text-white font-700 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20">
                  Continue to {fulfillment === 'pickup' ? 'Pickup Details' : 'Delivery'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!isStepTransitioning && step === 2 && (
        <form onSubmit={deliveryForm.handleSubmit(() => goToStep(3))} className="fade-in px-4 py-4 space-y-4 pb-8">
          <div className="space-y-3">
            <h2 className="text-base font-700 text-foreground">{fulfillment === 'pickup' ? 'Pickup Contact' : 'Delivery Address'}</h2>

            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">Full Name <span className="text-destructive">*</span></label>
              <input {...deliveryForm.register('fullName', { required: 'Full name is required' })} type="text" className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all border border-transparent focus:border-primary/30" placeholder="Maya Chen" />
            </div>

            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">Phone Number <span className="text-destructive">*</span></label>
              <input {...deliveryForm.register('phone', { required: 'Phone number is required', pattern: { value: /^\+?[\d\s\-()]{10,}$/, message: 'Enter a valid phone number' } })} type="tel" className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all border border-transparent focus:border-primary/30" placeholder="+1 (415) 555-0123" />
            </div>

            {fulfillment === 'delivery' ? (
              <>
                <div>
                  <label className="block text-sm font-600 text-foreground mb-1.5">Street Address <span className="text-destructive">*</span></label>
                  <input {...deliveryForm.register('address', { required: 'Address is required' })} type="text" className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all border border-transparent focus:border-primary/30" placeholder="2847 Fillmore St" />
                </div>
                <div>
                  <label className="block text-sm font-600 text-foreground mb-1.5">Apt / Suite / Floor</label>
                  <input {...deliveryForm.register('apt')} type="text" className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Apt 4B" />
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-2"><label className="block text-sm font-600 text-foreground mb-1.5">City <span className="text-destructive">*</span></label><input {...deliveryForm.register('city', { required: true })} type="text" className="w-full bg-muted rounded-xl px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="San Francisco" /></div>
                  <div className="col-span-1"><label className="block text-sm font-600 text-foreground mb-1.5">State <span className="text-destructive">*</span></label><input {...deliveryForm.register('state', { required: true })} type="text" maxLength={2} className="w-full bg-muted rounded-xl px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all uppercase" placeholder="CA" /></div>
                  <div className="col-span-2"><label className="block text-sm font-600 text-foreground mb-1.5">ZIP <span className="text-destructive">*</span></label><input {...deliveryForm.register('zip', { required: 'ZIP required', pattern: { value: /^\d{5}(-\d{4})?$/, message: 'Invalid ZIP' } })} type="text" className="w-full bg-muted rounded-xl px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="94115" /></div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-700 text-foreground">Pickup location</p>
                    <p className="text-sm text-muted-foreground mt-1">{pickupLocationLabel}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-700 text-foreground">Pickup window</p>
                    <p className="text-sm text-muted-foreground mt-1">Pickup happens from the chef location shown above once your order is ready.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-base font-700 text-foreground mb-3">{fulfillment === 'pickup' ? 'Pickup Time' : 'Delivery Time'}</h2>
            <div className="grid grid-cols-2 gap-2">
              {[{ value: 'asap', label: 'ASAP', sub: fulfillment === 'pickup' ? '20–30 min' : '45–60 min' }, { value: 'scheduled', label: 'Schedule', sub: 'Pick a time' }].map((opt) => (
                <label key={opt.value} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${deliveryForm.watch('deliveryTime') === opt.value ? 'border-primary bg-accent' : 'border-border hover:border-primary/40'}`}>
                  <input {...deliveryForm.register('deliveryTime')} type="radio" value={opt.value} className="sr-only" />
                  <span className="text-sm font-700 text-foreground">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.sub}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-600 text-foreground mb-1.5">Special Instructions</label>
            <textarea {...deliveryForm.register('instructions')} rows={3} className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none" placeholder={fulfillment === 'pickup' ? 'Pickup notes or anything the chef should know' : 'Allergies, dietary restrictions, or notes for the chef'} />
          </div>

          <div className="p-3 bg-muted/50 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">{cartCount} items · <span className="font-600 text-foreground font-tabular">${total.toFixed(2)}</span></span></div>
            <button type="button" onClick={() => setStep(1)} className="text-sm text-primary font-600 hover:underline">Edit</button>
          </div>

          <button type="submit" className="w-full bg-primary text-white font-700 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all duration-150 shadow-lg shadow-primary/20">
            Continue to Payment
            <ChevronRight className="w-5 h-5" />
          </button>
        </form>
      )}

      {!isStepTransitioning && step === 3 && (
        <form onSubmit={paymentForm.handleSubmit(handlePlaceOrder)} className="fade-in px-4 py-4 space-y-5 pb-8">
          <div>
            <h2 className="text-base font-700 text-foreground mb-3">Payment Method</h2>
            <div className="grid grid-cols-1 gap-2">
              {[{ id: 'card' as const, label: 'Card', icon: '💳' }].map((method) => (
                <button key={method.id} type="button" onClick={() => setSelectedPayment(method.id)} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 active:scale-95 ${selectedPayment === method.id ? 'border-primary bg-accent' : 'border-border hover:border-primary/40'}`}>
                  <span className="text-xl">{method.icon}</span>
                  <span className="text-xs font-600 text-foreground">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedPayment === 'card' && (
            <div className="space-y-3 fade-in">
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">Cardholder Name <span className="text-destructive">*</span></label>
                <input {...paymentForm.register('cardName', { required: 'Cardholder name is required' })} type="text" autoComplete="cc-name" className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Maya Chen" />
              </div>
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">Card Number <span className="text-destructive">*</span></label>
                <div className="relative">
                  <input {...paymentForm.register('cardNumber', { required: 'Card number is required', pattern: { value: /^[\d\s]{19}$/, message: 'Enter a valid 16-digit card number' }, onChange: (e) => { let val = e.target.value.replace(/\D/g, '').substring(0, 16); const formatted = val.replace(/(.{4})/g, '$1 ').trim(); paymentForm.setValue('cardNumber', formatted); } })} type="text" autoComplete="cc-number" maxLength={19} className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all font-tabular tracking-wider" placeholder="4242 4242 4242 4242" />
                  <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-600 text-foreground mb-1.5">Expiry <span className="text-destructive">*</span></label><input {...paymentForm.register('expiry', { required: 'Expiry required', pattern: { value: /^(0[1-9]|1[0-2])\/\d{2}$/, message: 'Format: MM/YY' }, onChange: (e) => { let val = e.target.value.replace(/\D/g, '').substring(0, 4); if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2); paymentForm.setValue('expiry', val); } })} type="text" autoComplete="cc-exp" maxLength={5} className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all font-tabular" placeholder="08/27" /></div>
                <div><label className="block text-sm font-600 text-foreground mb-1.5">CVV <span className="text-destructive">*</span></label><input {...paymentForm.register('cvv', { required: 'CVV required', pattern: { value: /^\d{3,4}$/, message: '3 or 4 digits' } })} type="password" autoComplete="cc-csc" maxLength={4} className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all font-tabular" placeholder="•••" /></div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">Card checkout is the only live payment method right now.</div>

          <div className="p-4 bg-card rounded-2xl border border-border space-y-2">
            <h3 className="text-sm font-700 text-foreground mb-2">Order Total</h3>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{cartCount} items</span><span className="font-500 text-foreground font-tabular">${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{fulfillment === 'pickup' ? 'Pickup' : 'Delivery'}</span><span className="font-500 text-foreground font-tabular">${deliveryFee.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Service fee</span><span className="font-500 text-foreground font-tabular">${serviceFee.toFixed(2)}</span></div>
            {promoApplied && <div className="flex justify-between text-sm"><span className="text-green-600 dark:text-green-400">Promo discount</span><span className="font-600 text-green-600 dark:text-green-400 font-tabular">−$8.00</span></div>}
            <div className="border-t border-border pt-2 flex justify-between"><span className="text-base font-700 text-foreground">Total charged</span><span className="text-lg font-700 text-primary font-tabular">${total.toFixed(2)}</span></div>
          </div>

          <button type="submit" disabled={isPlacingOrder} className="w-full bg-primary text-white font-700 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all duration-150 shadow-lg shadow-primary/20 disabled:opacity-80 disabled:cursor-not-allowed">
            {isPlacingOrder ? <><Loader2 className="w-5 h-5 animate-spin" />Placing your order...</> : <><ShoppingBag className="w-5 h-5" />Place Order · ${total.toFixed(2)}</>}
          </button>
        </form>
      )}

      {!isStepTransitioning && step === 4 && (
        <div className="fade-in px-4 py-6 pb-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 scale-in"><CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" /></div>
            <h1 className="text-2xl font-700 text-foreground mb-1">Order Placed! 🎉</h1>
            <p className="text-sm text-muted-foreground">{primaryChef.name} has been notified and can now update your order status.</p>
            <div className="mt-3 inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full"><span className="text-xs text-muted-foreground">Order ID:</span><span className="text-sm font-700 text-foreground font-tabular">{orderId}</span></div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 mb-4">
            <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-700 text-foreground">Order Status</h2><div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-xs text-muted-foreground">Live from chef updates</span></div></div>
            <div className="space-y-0">
              {ORDER_STEPS.map((stepItem, index) => {
                const stepIndex = STATUS_ORDER.indexOf(stepItem.status);
                const isDone = currentStatusIndex > stepIndex;
                const isCurrent = currentStatusIndex === stepIndex;
                const StepIcon = stepItem.icon;
                const isPickupReady = fulfillment === 'pickup' && stepItem.status === 'ready';
                const hideOnWayForPickup = fulfillment === 'pickup' && stepItem.status === 'on_the_way';
                if (hideOnWayForPickup) return null;
                return (
                  <div key={stepItem.status} className="flex gap-3">
                    <div className="flex flex-col items-center"><div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${isDone ? 'bg-green-100 dark:bg-green-900/30' : isCurrent ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-muted'}`}>{isDone ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" /> : <StepIcon className={`w-5 h-5 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />}</div>{index < ORDER_STEPS.length - 1 && <div className={`w-0.5 h-8 my-1 rounded-full transition-all duration-500 ${isDone ? 'bg-green-400' : 'bg-border'}`} />}</div>
                    <div className="flex-1 pb-2 flex items-start justify-between pt-1.5"><div><p className={`text-sm font-600 transition-colors ${isDone ? 'text-muted-foreground line-through' : isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>{isPickupReady ? 'Ready for Pickup' : stepItem.label}</p>{isCurrent && <p className="text-xs text-primary font-500 mt-0.5 fade-in">In progress...</p>}</div>{isCurrent && <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin mt-1" />}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 mb-4">
            <h2 className="text-sm font-700 text-foreground mb-3">Fulfillment Details</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              {fulfillment === 'pickup' ? (
                <p><span className="font-700 text-foreground">Pickup location:</span> {pickupLocationLabel}</p>
              ) : (
                <p><span className="font-700 text-foreground">Delivery address:</span> {[deliveryForm.getValues('address'), deliveryForm.getValues('apt'), deliveryForm.getValues('city'), deliveryForm.getValues('state'), deliveryForm.getValues('zip')].filter(Boolean).join(', ')}</p>
              )}
              <p><span className="font-700 text-foreground">Customer:</span> {deliveryForm.getValues('fullName')} · {deliveryForm.getValues('phone')}</p>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 mb-4">
            <h2 className="text-sm font-700 text-foreground mb-3">Your Order</h2>
            <div className="space-y-3">{cart.map((item) => <div key={item.id} className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-muted"><img src={item.image} alt={item.imageAlt} className="w-full h-full object-cover" /></div><div className="flex-1 min-w-0"><p className="text-sm font-600 text-foreground truncate">{item.title}</p><p className="text-xs text-muted-foreground">×{item.qty}</p></div><span className="text-sm font-700 text-foreground font-tabular shrink-0">${(item.price * item.qty).toFixed(2)}</span></div>)}</div>
            <div className="border-t border-border mt-3 pt-3 space-y-1.5"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-500 font-tabular">${subtotal.toFixed(2)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery + fees</span><span className="font-500 font-tabular">${(deliveryFee + serviceFee).toFixed(2)}</span></div><div className="flex justify-between pt-1 border-t border-border"><span className="text-base font-700 text-foreground">Total charged</span><span className="text-base font-700 text-primary font-tabular">${total.toFixed(2)}</span></div></div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 mb-4"><h2 className="text-sm font-700 text-foreground mb-2">What happens next</h2><div className="space-y-2 text-sm text-muted-foreground"><p>• The chef sees this order instantly in vendor orders.</p><p>• Your status now updates from the real order record instead of a fake timer.</p><p>• You can also track the order in your profile under My Orders.</p></div></div>

          <div className="space-y-3">
            <Link href="/profile-screen?tab=orders" className="block"><button className="w-full bg-primary text-white font-700 py-4 rounded-2xl hover:bg-primary/90 transition-all duration-150 shadow-lg shadow-primary/20">View My Orders</button></Link>
            <Link href={primaryChef.id ? `/vendor-profile?id=${primaryChef.id}` : '/nearby'} className="block"><button className="w-full border border-border text-foreground font-600 py-4 rounded-2xl hover:bg-muted transition-colors">View Chef's Profile</button></Link>
          </div>

          {customerOrderPlaced && orderStatus === 'delivered' && (
            <div className="mt-4 p-4 bg-accent rounded-2xl text-center fade-in">
              <p className="text-2xl mb-2">🍝</p>
              <p className="text-sm font-700 text-foreground mb-1">How was your meal?</p>
              <button onClick={() => setShowReviewModal(true)} className="w-full bg-primary text-white font-700 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all duration-150"><Star className="w-4 h-4 fill-white text-white" />Leave a Review</button>
            </div>
          )}

          <ReviewModal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} vendorName={primaryChef.name} vendorAvatar={primaryChef.avatar} dishes={cart.map((item) => ({ id: item.id, title: item.title, image: item.image, imageAlt: item.imageAlt }))} />
        </div>
      )}
    </div>
  );
}
