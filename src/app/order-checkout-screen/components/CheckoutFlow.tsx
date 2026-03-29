'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
  Navigation } from
'lucide-react';
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

type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'on_the_way' | 'delivered';

const ORDER_STEPS: {status: OrderStatus;label: string;icon: React.ElementType;time?: string;}[] = [
{ status: 'pending', label: 'Order Placed', icon: ShoppingBag, time: 'Just now' },
{ status: 'accepted', label: 'Chef Accepted', icon: ChefHat, time: '' },
{ status: 'preparing', label: 'Preparing Your Meal', icon: Package, time: '' },
{ status: 'on_the_way', label: 'On the Way', icon: Bike, time: '' },
{ status: 'delivered', label: 'Delivered', icon: Home, time: '' }];


const STATUS_ORDER: OrderStatus[] = ['pending', 'accepted', 'preparing', 'on_the_way', 'delivered'];

// Dynamic vendor delivery fee — set to 0 for "Free Delivery"
const vendorDeliveryFee = 4.99;

// Saved addresses for delivery (empty by default until real user address persistence is connected)
const SAVED_ADDRESSES: { id: string; label: string; address: string; city: string; state: string; zip: string }[] = [];


export default function CheckoutFlow() {
  const supabase = createClient();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1=Cart, 2=Delivery, 3=Payment, 4=Confirmation
  const [cart, setCart] = useState<CartItem[]>([]);
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('delivery');
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isStepTransitioning, setIsStepTransitioning] = useState(false);
  const [orderId, setOrderId] = useState(`INH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('pending');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'card' | 'apple' | 'google'>('card');
  const [showReviewModal, setShowReviewModal] = useState(false);

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
      instructions: ''
    }
  });

  const paymentForm = useForm<PaymentFormData>({
    defaultValues: {
      cardName: '',
      cardNumber: '',
      expiry: '',
      cvv: '',
      saveCard: false
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = window.localStorage.getItem('inhouse_checkout_cart');
      if (!saved) return;

      const parsed = JSON.parse(saved) as PersistedCheckoutCartItem[];
      if (!Array.isArray(parsed) || parsed.length === 0) return;

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
        },
      }));

      setCart(mapped);
    } catch {
      setCart([]);
    }
  }, []);

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = fulfillment === 'delivery' && subtotal > 0 ? vendorDeliveryFee : 0;
  const serviceFee = subtotal > 0 ? +(subtotal * 0.05).toFixed(2) : 0;
  const promoDiscount = promoApplied ? -8.00 : 0;
  const total = +(subtotal + deliveryFee + serviceFee + promoDiscount).toFixed(2);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  // Monetization: platform takes 15% of subtotal, chef earns 85%
  const PLATFORM_FEE_RATE = 0.15;
  const platformFee = +(subtotal * PLATFORM_FEE_RATE).toFixed(2);
  const chefEarnings = +(subtotal * (1 - PLATFORM_FEE_RATE)).toFixed(2);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const newQty = item.qty + delta;
      return newQty > 0 ? { ...item, qty: newQty } : item;
    }).filter((item) => !(item.id === id && item.qty + delta <= 0)));
    // Backend integration: PATCH /api/cart/items/:id { qty }
  }, []);

  const removeItem = useCallback((id: string, title: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    toast.success(`${title} removed from cart`);
    // Backend integration: DELETE /api/cart/items/:id
  }, []);

  const applyPromo = () => {
    if (promoCode.toLowerCase() === 'inhouse10') {
      setPromoApplied(true);
      toast.success('Promo code applied! $8.00 off your order 🎉');
    } else {
      toast.error('Invalid promo code. Try INHOUSE10 for $8 off.');
    }
    // Backend integration: POST /api/promo/validate { code: promoCode }
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

      if (!chefId) {
        throw new Error('Chef information is missing for this order.');
      }

      const { data: orderRow, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          chef_id: chefId,
          status: 'pending',
          fulfillment_type: fulfillment,
          customer_name: deliveryValues.fullName || '',
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
        .select('id')
        .single();

      if (orderError || !orderRow?.id) {
        throw orderError || new Error('Could not create order.');
      }

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

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload);

      if (itemsError) {
        throw itemsError;
      }

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

      if (revenueError) {
        throw revenueError;
      }

      setOrderId(orderRow.id);
      setStep(4);
      toast.success('Order placed successfully!');

      // Keep lightweight simulated progression for customer-side UX until vendor-driven live status is wired.
      const statusProgression: OrderStatus[] = ['accepted', 'preparing', 'on_the_way', 'delivered'];
      statusProgression.forEach((status, index) => {
        setTimeout(() => {
          setOrderStatus(status);
          const labels: Record<OrderStatus, string> = {
            pending: 'Order placed',
            accepted: 'Chef accepted your order!',
            preparing: 'Your chef is preparing the order',
            on_the_way: 'Your order is on the way!',
            delivered: 'Delivered! Enjoy your meal 🍝'
          };
          toast.success(labels[status]);
          if (status === 'delivered') {
            setTimeout(() => setShowReviewModal(true), 1500);
          }
        }, (index + 1) * 4000);
      });
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
  { num: 4, label: 'Confirm' }];


  const currentStatusIndex = STATUS_ORDER.indexOf(orderStatus);
  const primaryChef = cart[0]?.chef ?? {
    id: '',
    name: 'InHouse Chef',
    avatar: cart[0]?.image || '/assets/images/no_image.png',
    rating: 5,
  };

  const goToStep = (nextStep: 1 | 2 | 3 | 4) => {
    setIsStepTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsStepTransitioning(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {step < 4 &&
      <div className="sticky top-14 z-30 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            {step > 1 ?
          <button
            onClick={() => goToStep((step - 1) as 1 | 2 | 3 | 4)}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-95"
            aria-label="Go back">

                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button> :

          <Link href="/home-feed">
                <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors" aria-label="Back to feed">
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
              </Link>
          }
            <h1 className="text-lg font-700 text-foreground">
              {step === 1 ? 'Your Cart' : step === 2 ? (fulfillment === 'pickup' ? 'Pickup Details' : 'Delivery Details') : 'Payment'}
            </h1>
            {step === 1 && cartCount > 0 &&
          <span className="ml-auto text-sm text-muted-foreground font-tabular">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
          }
          </div>

          {/* Step Progress */}
          <div className="flex items-center gap-1">
            {STEPS.slice(0, 3).map((s, idx) =>
          <React.Fragment key={s.num}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-700 transition-all ${
              step > s.num ?
              'bg-primary text-white' :
              step === s.num ?
              'bg-primary text-white ring-2 ring-primary/30' : 'bg-muted text-muted-foreground'}`
              }>
                    {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`text-xs font-500 hidden sm:inline ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < 2 &&
            <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${step > s.num ? 'bg-primary' : 'bg-muted'}`} />
            }
              </React.Fragment>
          )}
          </div>
        </div>
      }

      {/* ── STEP TRANSITION SKELETON ── */}
      {isStepTransitioning && step < 4 && (
        <div className="fade-in">
          {step === 1 && <CheckoutDeliverySkeleton />}
          {step === 2 && <CheckoutPaymentSkeleton />}
          {step === 3 && <CheckoutCartSkeleton />}
        </div>
      )}

      {/* ── STEP 1: CART ── */}
      {!isStepTransitioning && step === 1 &&
      <div className="fade-in">
          <div className="mx-4 mt-4 p-3 rounded-2xl border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-700 text-foreground">Checkout test mode</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This flow is ready for user testing, but payments and live order dispatch are still simulated in this version.
                </p>
              </div>
            </div>
          </div>
          {/* ── FULFILLMENT TOGGLE ── */}
          <div className="mx-4 mt-4">
            <div className="relative flex bg-muted rounded-2xl p-1 overflow-hidden">
              {/* Sliding background pill */}
              <div
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 ease-in-out shadow-sm"
                style={{
                  backgroundColor: '#FFA500',
                  left: fulfillment === 'pickup' ? '4px' : 'calc(50%)',
                }}
              />
              {/* Pickup button */}
              <button
                type="button"
                onClick={() => setFulfillment('pickup')}
                className="relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-600 transition-colors duration-300"
                style={{ color: fulfillment === 'pickup' ? '#ffffff' : undefined }}
              >
                <ChefHat className={`w-4 h-4 transition-colors duration-300 ${fulfillment === 'pickup' ? 'text-white' : 'text-muted-foreground'}`} />
                <span className={fulfillment === 'pickup' ? 'text-white' : 'text-muted-foreground'}>Pickup</span>
              </button>
              {/* Delivery button */}
              <button
                type="button"
                onClick={() => setFulfillment('delivery')}
                className="relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-600 transition-colors duration-300"
              >
                <Bike className={`w-4 h-4 transition-colors duration-300 ${fulfillment === 'delivery' ? 'text-white' : 'text-muted-foreground'}`} />
                <span className={fulfillment === 'delivery' ? 'text-white' : 'text-muted-foreground'}>Delivery</span>
              </button>
            </div>

            {/* ── PICKUP: Vendor Location Map Snippet ── */}
            {fulfillment === 'pickup' && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-border transition-all duration-300 fade-in">
                {/* Map placeholder with pin */}
                <div className="relative h-36 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950/30 dark:to-teal-900/30 flex items-center justify-center">
                  {/* Stylized map grid */}
                  <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 300 144" preserveAspectRatio="xMidYMid slice">
                    <line x1="0" y1="48" x2="300" y2="48" stroke="currentColor" strokeWidth="1" className="text-teal-600" />
                    <line x1="0" y1="96" x2="300" y2="96" stroke="currentColor" strokeWidth="1" className="text-teal-600" />
                    <line x1="75" y1="0" x2="75" y2="144" stroke="currentColor" strokeWidth="1" className="text-teal-600" />
                    <line x1="150" y1="0" x2="150" y2="144" stroke="currentColor" strokeWidth="1" className="text-teal-600" />
                    <line x1="225" y1="0" x2="225" y2="144" stroke="currentColor" strokeWidth="1" className="text-teal-600" />
                    <rect x="60" y="30" width="50" height="30" rx="4" fill="currentColor" className="text-teal-300" opacity="0.5" />
                    <rect x="130" y="55" width="70" height="25" rx="4" fill="currentColor" className="text-teal-300" opacity="0.5" />
                    <rect x="180" y="20" width="40" height="40" rx="4" fill="currentColor" className="text-teal-300" opacity="0.4" />
                  </svg>
                  {/* Map pin */}
                  <div className="relative flex flex-col items-center">
                    <div
                      className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: '#FFA500' }}
                    >
                      <MapPin className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="w-3 h-3 bg-white/80 mt-1 shadow" />
                  </div>
                </div>
                {/* Location info */}
                <div className="bg-card px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: '#FFA500' + '20' }}
                    >
                      <Navigation className="w-4 h-4" style={{ color: '#FFA500' }} />
                    </div>
                    <div>
                      <p className="text-sm font-700 text-foreground">Marco's Kitchen</p>
                      <p className="text-xs text-muted-foreground">1420 Valencia St, San Francisco, CA 94110</p>
                    </div>
                  </div>
                  <button
                    className="text-xs font-600 px-3 py-1.5 rounded-full border transition-all active:scale-95"
                    style={{ borderColor: '#FFA500', color: '#FFA500' }}
                    onClick={() => window.open('https://maps.google.com/?q=1420+Valencia+St+San+Francisco+CA', '_blank')}
                  >
                    Directions
                  </button>
                </div>
                <div className="bg-muted/40 px-4 py-2 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Ready for pickup in <span className="font-600 text-foreground">20–30 min</span></span>
                </div>
              </div>
            )}

            {/* ── DELIVERY: Saved Addresses ── */}
            {fulfillment === 'delivery' && (
              <div className="mt-3 space-y-2 transition-all duration-300 fade-in">
                <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide px-0.5">Deliver to</p>
                {SAVED_ADDRESSES.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => setSelectedSavedAddress(addr.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 active:scale-[0.98] text-left"
                    style={{
                      borderColor: selectedSavedAddress === addr.id ? '#FFA500' : undefined,
                      backgroundColor: selectedSavedAddress === addr.id ? '#FFA50010' : undefined,
                    }}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${selectedSavedAddress === addr.id ? '' : 'bg-muted'}`}
                      style={{ backgroundColor: selectedSavedAddress === addr.id ? '#FFA500' : undefined }}
                    >
                      <MapPin
                        className={`w-4 h-4 ${selectedSavedAddress === addr.id ? 'text-white' : 'text-muted-foreground'}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-700 text-foreground">{addr.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{addr.address}, {addr.city}, {addr.state} {addr.zip}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selectedSavedAddress === addr.id ? 'border-[#FFA500]' : 'border-border'}`}
                    >
                      {selectedSavedAddress === addr.id && (
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FFA500' }} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {cart.length === 0 ?
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-700 text-foreground mb-2">Your cart is empty</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Discover personal chefs near you and add their delicious meals to your cart.
              </p>
              <Link href="/home-feed">
                <button className="bg-primary text-white font-600 px-6 py-3 rounded-full hover:bg-primary/90 active:scale-95 transition-all duration-150">
                  Browse Chefs
                </button>
              </Link>
            </div> :

        <>
              {/* Chef Info Banner */}
              <div className="mx-4 mt-4 p-3 bg-accent rounded-2xl flex items-center gap-3">
                <Link href="/vendor-profile">
                  <img
                src={cart[0].chef.avatar}
                alt={`${cart[0].chef.name} chef avatar`}
                className="w-10 h-10 rounded-full object-cover border-2 border-primary/20 hover:opacity-80 transition-opacity" />
                </Link>

                <div className="flex-1 min-w-0">
                  <Link href="/vendor-profile">
                    <p className="text-sm font-700 text-foreground hover:text-primary transition-colors">{cart[0].chef.name}</p>
                  </Link>
                  <div className="flex items-center gap-1">
                    <ChefHat className="w-3 h-3 text-primary" />
                    <span className="text-xs text-muted-foreground">Personal Chef</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-600 text-foreground font-tabular">{cart[0].chef.rating}</span>
                  </div>
                </div>
                <Link href="/vendor-profile">
                  <button className="text-xs font-600 text-primary border border-primary/30 px-3 py-1.5 rounded-full hover:bg-primary hover:text-white transition-all duration-150 active:scale-95">
                    + Add Items
                  </button>
                </Link>
              </div>

              {/* Cart Items */}
              <div className="px-4 mt-3 space-y-2">
                {cart.map((item) =>
            <div key={item.id} className="flex gap-3 p-3 bg-card rounded-2xl border border-border">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-muted">
                      <img
                  src={item.image}
                  alt={item.imageAlt}
                  className="w-full h-full object-cover"
                  loading="lazy" />

                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-700 text-foreground truncate">{item.title}</h3>
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        </div>
                        <button
                    onClick={() => removeItem(item.id, item.title)}
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-destructive/10 hover:scale-110 transition-all duration-150"
                    aria-label={`Remove ${item.title} from cart`}>

                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-base font-700 text-primary font-tabular">${(item.price * item.qty).toFixed(2)}</span>

                        <div className="flex items-center gap-2 bg-muted rounded-full px-1 py-0.5">
                          <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-border hover:scale-110 transition-all duration-150 active:scale-95"
                      aria-label="Decrease quantity">

                            <Minus className="w-3.5 h-3.5 text-foreground" />
                          </button>
                          <span className="text-sm font-700 text-foreground font-tabular w-4 text-center">{item.qty}</span>
                          <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-7 h-7 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 hover:scale-110 transition-all duration-150 active:scale-95"
                      aria-label="Increase quantity">

                            <Plus className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
            )}
              </div>

              {/* Promo Code */}
              <div className="mx-4 mt-4">
                <div className="flex gap-2">
                  <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Promo code (try INHOUSE10)"
                className="flex-1 bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all" />

                  <button
                onClick={applyPromo}
                disabled={promoApplied || !promoCode}
                className={`px-4 py-3 rounded-xl text-sm font-600 transition-all duration-150 active:scale-95 hover:scale-105 ${
                promoApplied ?
                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-primary text-white hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'}`
                }>

                    {promoApplied ? '✓ Applied' : 'Apply'}
                  </button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="mx-4 mt-4 p-4 bg-muted/50 rounded-2xl space-y-2">
                <h3 className="text-sm font-700 text-foreground mb-3">Order Summary</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-500 text-foreground font-tabular">${subtotal.toFixed(2)}</span>
                </div>
                {fulfillment === 'delivery' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery fee</span>
                    {vendorDeliveryFee === 0 ? (
                      <span className="font-600 text-emerald-600 dark:text-emerald-400">Free Delivery</span>
                    ) : (
                      <span className="font-500 text-foreground font-tabular">${deliveryFee.toFixed(2)}</span>
                    )}
                  </div>
                )}
                {fulfillment === 'pickup' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pickup</span>
                    <span className="font-600 text-emerald-600 dark:text-emerald-400">Free</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service fee (5%)</span>
                  <span className="font-500 text-foreground font-tabular">${serviceFee.toFixed(2)}</span>
                </div>
                {promoApplied &&
            <div className="flex justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400">Promo (INHOUSE10)</span>
                    <span className="font-600 text-green-600 dark:text-green-400 font-tabular">−$8.00</span>
                  </div>
            }
                <div className="border-t border-border pt-2 mt-2 flex justify-between">
                  <span className="text-base font-700 text-foreground">Total</span>
                  <span className="text-base font-700 text-primary font-tabular">${total.toFixed(2)}</span>
                </div>

                {/* Earnings Breakdown */}
                {subtotal > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                    <p className="text-[10px] font-600 text-muted-foreground uppercase tracking-wide mb-1.5">Revenue Breakdown</p>
                    <div className="flex justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <ChefHat className="w-3 h-3 text-amber-500" />
                        Chef estimated earnings (85%)
                      </span>
                      <span className="font-600 text-emerald-600 dark:text-emerald-400 font-tabular">${chefEarnings.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center text-[7px] font-bold text-primary">%</span>
                        Platform fee (15%)
                      </span>
                      <span className="font-600 text-muted-foreground font-tabular">${platformFee.toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                      Vendor payouts are shown as examples in this build so chefs can understand how earnings will be tracked.
                    </p>
                  </div>
                )}
              </div>

              {/* Continue Button */}
              <div className="px-4 py-4 pb-8">
                <button
              onClick={() => goToStep(2)}
              className="w-full bg-primary text-white font-700 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 shadow-lg shadow-primary/20">

                  Continue to Delivery
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </>
        }
        </div>
      }

      {/* ── STEP 2: DELIVERY / PICKUP ── */}
      {!isStepTransitioning && step === 2 &&
      <form
        onSubmit={deliveryForm.handleSubmit(() => goToStep(3))}
        className="fade-in px-4 py-4 space-y-4 pb-8">

          <div className="space-y-3">
            <h2 className="text-base font-700 text-foreground">{fulfillment === 'pickup' ? 'Pickup Contact' : 'Delivery Address'}</h2>

            {fulfillment === 'delivery' && SAVED_ADDRESSES.length > 0 && (
              <>
                {/* Saved addresses quick select */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {SAVED_ADDRESSES.map((addr) =>
                    <button
                      type="button"
                      key={addr.id}
                      onClick={() => {
                        setSelectedSavedAddress(addr.id);
                        deliveryForm.setValue('address', addr.address);
                        deliveryForm.setValue('city', addr.city);
                        deliveryForm.setValue('state', addr.state);
                        deliveryForm.setValue('zip', addr.zip);
                      }}
                      className="shrink-0 flex items-center gap-2 text-xs font-500 px-3 py-2 rounded-full border border-border hover:border-primary hover:bg-accent transition-all duration-150 active:scale-95">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {addr.label}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                {...deliveryForm.register('fullName', { required: 'Full name is required' })}
                type="text"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all border border-transparent focus:border-primary/30"
                placeholder="Maya Chen" />

              {deliveryForm.formState.errors.fullName &&
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {deliveryForm.formState.errors.fullName.message}
                </p>
              }
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">
                Phone Number <span className="text-destructive">*</span>
              </label>
              <input
                {...deliveryForm.register('phone', {
                  required: 'Phone number is required',
                  pattern: { value: /^\+?[\d\s\-()]{10,}$/, message: 'Enter a valid phone number' }
                })}
                type="tel"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all border border-transparent focus:border-primary/30"
                placeholder="+1 (415) 555-0123" />

              {deliveryForm.formState.errors.phone &&
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {deliveryForm.formState.errors.phone.message}
                </p>
              }
            </div>

            {fulfillment === 'delivery' ? (
              <>
                {/* Street Address */}
                <div>
                  <label className="block text-sm font-600 text-foreground mb-1.5">
                    Street Address <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...deliveryForm.register('address', { required: 'Address is required' })}
                    type="text"
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all border border-transparent focus:border-primary/30"
                    placeholder="2847 Fillmore St" />

                  {deliveryForm.formState.errors.address &&
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {deliveryForm.formState.errors.address.message}
                    </p>
                  }
                </div>

                {/* Apt / Suite */}
                <div>
                  <label className="block text-sm font-600 text-foreground mb-1.5">Apt / Suite / Floor</label>
                  <p className="text-xs text-muted-foreground mb-1.5">Optional — helps the chef find you faster</p>
                  <input
                    {...deliveryForm.register('apt')}
                    type="text"
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    placeholder="Apt 4B" />
                </div>

                {/* City, State, ZIP */}
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-2">
                    <label className="block text-sm font-600 text-foreground mb-1.5">City <span className="text-destructive">*</span></label>
                    <input
                      {...deliveryForm.register('city', { required: true })}
                      type="text"
                      className="w-full bg-muted rounded-xl px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                      placeholder="San Francisco" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-600 text-foreground mb-1.5">State <span className="text-destructive">*</span></label>
                    <input
                      {...deliveryForm.register('state', { required: true })}
                      type="text"
                      maxLength={2}
                      className="w-full bg-muted rounded-xl px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all uppercase"
                      placeholder="CA" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-600 text-foreground mb-1.5">ZIP <span className="text-destructive">*</span></label>
                    <input
                      {...deliveryForm.register('zip', {
                        required: 'ZIP required',
                        pattern: { value: /^\d{5}(-\d{4})?$/, message: 'Invalid ZIP' }
                      })}
                      type="text"
                      className="w-full bg-muted rounded-xl px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                      placeholder="94115" />
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-700 text-foreground">Pickup location</p>
                    <p className="text-sm text-muted-foreground mt-1">Marco's Kitchen · 1420 Valencia St, San Francisco, CA 94110</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-700 text-foreground">Pickup window</p>
                    <p className="text-sm text-muted-foreground mt-1">Most pickup orders are ready in 20–30 minutes.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Delivery / Pickup Time */}
          <div>
            <h2 className="text-base font-700 text-foreground mb-3">{fulfillment === 'pickup' ? 'Pickup Time' : 'Delivery Time'}</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'asap', label: 'ASAP', sub: fulfillment === 'pickup' ? '20–30 min' : '45–60 min' },
                { value: 'scheduled', label: 'Schedule', sub: 'Pick a time' }
              ].map((opt) =>
                <label
                  key={opt.value}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                    deliveryForm.watch('deliveryTime') === opt.value ?
                    'border-primary bg-accent' : 'border-border hover:border-primary/40'}`
                  }>
                  <input
                    {...deliveryForm.register('deliveryTime')}
                    type="radio"
                    value={opt.value}
                    className="sr-only" />

                  <span className="text-sm font-700 text-foreground">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.sub}</span>
                </label>
              )}
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-sm font-600 text-foreground mb-1.5">Special Instructions</label>
            <p className="text-xs text-muted-foreground mb-1.5">{fulfillment === 'pickup' ? 'Pickup notes or anything the chef should know' : 'Allergies, dietary restrictions, or notes for the chef'}</p>
            <textarea
              {...deliveryForm.register('instructions')}
              rows={3}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
              placeholder={fulfillment === 'pickup' ? 'e.g. I will arrive in a black Honda around 6:15 PM' : 'e.g. Nut allergy, extra spicy, leave at door...'} />
          </div>

          {/* Order mini-summary */}
          <div className="p-3 bg-muted/50 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{cartCount} items · <span className="font-600 text-foreground font-tabular">${total.toFixed(2)}</span></span>
            </div>
            <button type="button" onClick={() => setStep(1)} className="text-sm text-primary font-600 hover:underline">Edit</button>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white font-700 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-primary/20">
            Continue to Payment
            <ChevronRight className="w-5 h-5" />
          </button>
        </form>
      }

      {/* ── STEP 3: PAYMENT ── */}
      {!isStepTransitioning && step === 3 &&
      <form
        onSubmit={paymentForm.handleSubmit(handlePlaceOrder)}
        className="fade-in px-4 py-4 space-y-5 pb-8">

          {/* Payment Method Selector */}
          <div>
            <h2 className="text-base font-700 text-foreground mb-3">Payment Method</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
            { id: 'card' as const, label: 'Card', icon: '💳' },
            { id: 'apple' as const, label: 'Apple Pay', icon: '🍎' },
            { id: 'google' as const, label: 'Google Pay', icon: '🔵' }].
            map((method) =>
            <button
              key={method.id}
              type="button"
              onClick={() => setSelectedPayment(method.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 active:scale-95 ${
              selectedPayment === method.id ?
              'border-primary bg-accent' : 'border-border hover:border-primary/40'}`
              }>

                  <span className="text-xl">{method.icon}</span>
                  <span className="text-xs font-600 text-foreground">{method.label}</span>
                </button>
            )}
            </div>
          </div>

          {/* Card Form — Stripe-ready structure */}
          {selectedPayment === 'card' &&
        <div className="space-y-3 fade-in">
              {/* Backend integration: Replace this form with Stripe Elements <CardElement /> */}
              {/* Stripe integration point: import { loadStripe } from '@stripe/stripe-js';
            */}
              {/* Use <Elements stripe={stripePromise}> wrapper and <CardElement> here */}

              <div className="bg-accent/50 border border-primary/20 rounded-xl px-3 py-2 flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  This is a demo. In production, this form is replaced with{' '}
                  <span className="font-600 text-foreground">Stripe Elements</span> for PCI-compliant payments.
                </p>
              </div>

              {/* Cardholder Name */}
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">
                  Cardholder Name <span className="text-destructive">*</span>
                </label>
                <input
              {...paymentForm.register('cardName', { required: 'Cardholder name is required' })}
              type="text"
              autoComplete="cc-name"
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              placeholder="Maya Chen" />

                {paymentForm.formState.errors.cardName &&
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {paymentForm.formState.errors.cardName.message}
                  </p>
            }
              </div>

              {/* Card Number */}
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">
                  Card Number <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                {...paymentForm.register('cardNumber', {
                  required: 'Card number is required',
                  pattern: { value: /^[\d\s]{19}$/, message: 'Enter a valid 16-digit card number' },
                  onChange: (e) => {
                    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
                    const formatted = val.replace(/(.{4})/g, '$1 ').trim();
                    paymentForm.setValue('cardNumber', formatted);
                  }
                })}
                type="text"
                autoComplete="cc-number"
                maxLength={19}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all font-tabular tracking-wider"
                placeholder="4242 4242 4242 4242" />

                  <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
                {paymentForm.formState.errors.cardNumber &&
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {paymentForm.formState.errors.cardNumber.message}
                  </p>
            }
              </div>

              {/* Expiry + CVV */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-600 text-foreground mb-1.5">
                    Expiry <span className="text-destructive">*</span>
                  </label>
                  <input
                {...paymentForm.register('expiry', {
                  required: 'Expiry required',
                  pattern: { value: /^(0[1-9]|1[0-2])\/\d{2}$/, message: 'Format: MM/YY' },
                  onChange: (e) => {
                    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
                    if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
                    paymentForm.setValue('expiry', val);
                  }
                })}
                type="text"
                autoComplete="cc-exp"
                maxLength={5}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all font-tabular"
                placeholder="08/27" />

                  {paymentForm.formState.errors.expiry &&
              <p className="text-xs text-destructive mt-1">{paymentForm.formState.errors.expiry.message}</p>
              }
                </div>
                <div>
                  <label className="block text-sm font-600 text-foreground mb-1.5">
                    CVV <span className="text-destructive">*</span>
                  </label>
                  <input
                {...paymentForm.register('cvv', {
                  required: 'CVV required',
                  pattern: { value: /^\d{3,4}$/, message: '3 or 4 digits' }
                })}
                type="password"
                autoComplete="cc-csc"
                maxLength={4}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all font-tabular"
                placeholder="•••" />

                  {paymentForm.formState.errors.cvv &&
              <p className="text-xs text-destructive mt-1">{paymentForm.formState.errors.cvv.message}</p>
              }
                </div>
              </div>

              {/* Save Card */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                {...paymentForm.register('saveCard')}
                type="checkbox"
                className="sr-only peer" />

                  <div className="w-10 h-6 bg-muted rounded-full peer-checked:bg-primary transition-colors duration-200" />
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-4" />
                </div>
                <span className="text-sm font-500 text-foreground">Save card for future orders</span>
              </label>
            </div>
        }

          {/* Apple Pay / Google Pay placeholder */}
          {(selectedPayment === 'apple' || selectedPayment === 'google') &&
        <div className="bg-muted/50 rounded-2xl p-6 text-center fade-in">
              <p className="text-2xl mb-2">{selectedPayment === 'apple' ? '🍎' : '🔵'}</p>
              <p className="text-sm font-600 text-foreground mb-1">
                {selectedPayment === 'apple' ? 'Apple Pay' : 'Google Pay'} Ready
              </p>
              <p className="text-xs text-muted-foreground">
                {/* Backend integration: Stripe PaymentRequest Button handles Apple/Google Pay */}
                You'll be prompted to authenticate with{' '}
                {selectedPayment === 'apple' ? 'Face ID / Touch ID' : 'your Google account'} when you place your order.
              </p>
            </div>
        }

          {/* Final Order Summary */}
          <div className="p-4 bg-card rounded-2xl border border-border space-y-2">
            <h3 className="text-sm font-700 text-foreground mb-2">Order Total</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{cartCount} items</span>
              <span className="font-500 text-foreground font-tabular">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery</span>
              <span className="font-500 text-foreground font-tabular">${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service fee</span>
              <span className="font-500 text-foreground font-tabular">${serviceFee.toFixed(2)}</span>
            </div>
            {promoApplied &&
          <div className="flex justify-between text-sm">
                <span className="text-green-600 dark:text-green-400">Promo discount</span>
                <span className="font-600 text-green-600 dark:text-green-400 font-tabular">−$8.00</span>
              </div>
            }
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="text-base font-700 text-foreground">Total charged</span>
              <span className="text-lg font-700 text-primary font-tabular">${total.toFixed(2)}</span>
            </div>

            {/* Earnings Breakdown */}
            {subtotal > 0 && (
              <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                <p className="text-[10px] font-600 text-muted-foreground uppercase tracking-wide mb-1.5">Revenue Breakdown</p>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <ChefHat className="w-3 h-3 text-amber-500" />
                    Chef earns (85%)
                  </span>
                  <span className="font-600 text-emerald-600 dark:text-emerald-400 font-tabular">${chefEarnings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center text-[7px] font-bold text-primary">%</span>
                    Platform fee (15%)
                  </span>
                  <span className="font-600 text-muted-foreground font-tabular">${platformFee.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Security note */}
          <div className="flex items-center gap-2 justify-center">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs text-muted-foreground">Secured by Stripe · 256-bit SSL encryption</p>
          </div>

          {/* Place Order Button */}
          <button
          type="submit"
          disabled={isPlacingOrder}
          className="w-full bg-primary text-white font-700 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-primary/20 disabled:opacity-80 disabled:cursor-not-allowed disabled:hover:scale-100">

            {isPlacingOrder ?
          <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Placing your order...
              </> :

          <>
                <ShoppingBag className="w-5 h-5" />
                Place Order · ${total.toFixed(2)}
              </>
          }
          </button>

          <p className="text-xs text-muted-foreground text-center">
            By placing this order you agree to InHouse's{' '}
            <button className="text-primary hover:underline">Terms of Service</button> and{' '}
            <button className="text-primary hover:underline">Cancellation Policy</button>.
          </p>
        </form>
      }

      {/* ── STEP 4: ORDER CONFIRMATION ── */}
      {!isStepTransitioning && step === 4 &&
      <div className="fade-in px-4 py-6 pb-10">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 scale-in">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-700 text-foreground mb-1">Order Placed! 🎉</h1>
            <p className="text-sm text-muted-foreground">
              {primaryChef.name} has been notified and will confirm your order shortly.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full">
              <span className="text-xs text-muted-foreground">Order ID:</span>
              <span className="text-sm font-700 text-foreground font-tabular">{orderId}</span>
            </div>
          </div>

          {/* Order Status Stepper */}
          <div className="bg-card rounded-2xl border border-border p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-700 text-foreground">Order Status</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-muted-foreground">Live tracking</span>
              </div>
            </div>

            <div className="space-y-0">
              {ORDER_STEPS.map((step_item, index) => {
              const stepIndex = STATUS_ORDER.indexOf(step_item.status);
              const isDone = currentStatusIndex > stepIndex;
              const isCurrent = currentStatusIndex === stepIndex;
              const isPending = currentStatusIndex < stepIndex;
              const StepIcon = step_item.icon;

              return (
                <div key={step_item.status} className="flex gap-3">
                    {/* Icon + connector */}
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                    isDone ?
                    'bg-green-100 dark:bg-green-900/30' :
                    isCurrent ?
                    'bg-primary/10 ring-2 ring-primary/30' : 'bg-muted'}`
                    }>
                        {isDone ?
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" /> :

                      <StepIcon className={`w-5 h-5 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                      }
                      </div>
                      {index < ORDER_STEPS.length - 1 &&
                    <div className={`w-0.5 h-8 my-1 rounded-full transition-all duration-500 ${
                    isDone ? 'bg-green-400' : 'bg-border'}`
                    } />
                    }
                    </div>

                    {/* Label */}
                    <div className="flex-1 pb-2 flex items-start justify-between pt-1.5">
                      <div>
                        <p className={`text-sm font-600 transition-colors ${
                      isDone ?
                      'text-muted-foreground line-through' :
                      isCurrent ?
                      'text-foreground' :
                      'text-muted-foreground'}`
                      }>
                          {step_item.label}
                        </p>
                        {isCurrent &&
                      <p className="text-xs text-primary font-500 mt-0.5 fade-in">In progress...</p>
                      }
                      </div>
                      {isDone && step_item.time &&
                    <span className="text-xs text-muted-foreground font-tabular">{step_item.time}</span>
                    }
                      {isCurrent &&
                    <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin mt-1" />
                    }
                    </div>
                  </div>);

            })}
            </div>

            {/* ETA */}
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-600 text-foreground">Estimated delivery</span>
              </div>
              <span className="text-sm font-700 text-primary">
                {new Date(Date.now() + 55 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Order Items Summary */}
          <div className="bg-card rounded-2xl border border-border p-4 mb-4">
            <h2 className="text-sm font-700 text-foreground mb-3">Your Order</h2>
            <div className="space-y-3">
              {cart.map((item) =>
            <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-muted">
                    <img
                  src={item.image}
                  alt={item.imageAlt}
                  className="w-full h-full object-cover" />

                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-600 text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">×{item.qty}</p>
                  </div>
                  <span className="text-sm font-700 text-foreground font-tabular shrink-0">
                    ${(item.price * item.qty).toFixed(2)}
                  </span>
                </div>
            )}
            </div>

            <div className="border-t border-border mt-3 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-500 font-tabular">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery + fees</span>
                <span className="font-500 font-tabular">${(deliveryFee + serviceFee).toFixed(2)}</span>
              </div>
              {promoApplied &&
            <div className="flex justify-between text-sm">
                  <span className="text-green-600 dark:text-green-400">Promo discount</span>
                  <span className="font-600 text-green-600 dark:text-green-400 font-tabular">−$8.00</span>
                </div>
            }
              <div className="flex justify-between pt-1 border-t border-border">
                <span className="text-base font-700 text-foreground">Total charged</span>
                <span className="text-base font-700 text-primary font-tabular">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Chef Contact Card */}
          <div className="bg-card rounded-2xl border border-border p-4 mb-4">
            <h2 className="text-sm font-700 text-foreground mb-3">Your Chef</h2>
            <div className="flex items-center gap-3">
              <img
              src={primaryChef.avatar}
              alt={`${primaryChef.name} chef avatar`}
              className="w-12 h-12 rounded-full object-cover border-2 border-primary/20" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-700 text-foreground">{primaryChef.name}</p>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-600 text-foreground font-tabular">{primaryChef.rating}</span>
                  <span className="text-xs text-muted-foreground">· Personal Chef</span>
                </div>
              </div>
              <button className="flex items-center gap-2 text-sm font-600 text-primary border border-primary/30 px-3 py-2 rounded-xl hover:bg-accent transition-colors active:scale-95">
                Message
              </button>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 mb-4">
            <h2 className="text-sm font-700 text-foreground mb-2">What happens next</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• The chef receives the order instantly in their vendor tools.</p>
              <p>• Order status updates move from accepted → preparing → ready → delivered.</p>
              <p>• Vendor earnings and payouts shown in this build are example business metrics for testing.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href="/home-feed" className="block">
              <button className="w-full bg-primary text-white font-700 py-4 rounded-2xl hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-primary/20">
                Back to Feed
              </button>
            </Link>
            <Link href={primaryChef.id ? `/vendor-profile?id=${primaryChef.id}` : '/nearby'} className="block">
              <button className="w-full border border-border text-foreground font-600 py-4 rounded-2xl hover:bg-muted transition-colors active:scale-[0.98]">
                View Chef's Profile
              </button>
            </Link>
          </div>

          {/* Rate your experience prompt (shown after 'delivered') */}
          {orderStatus === 'delivered' &&
        <div className="mt-4 p-4 bg-accent rounded-2xl text-center fade-in">
              <p className="text-2xl mb-2">🍝</p>
              <p className="text-sm font-700 text-foreground mb-1">How was your meal?</p>
              <p className="text-xs text-muted-foreground mb-3">Your review helps {primaryChef.name} and other food lovers</p>
              <button
                onClick={() => setShowReviewModal(true)}
                className="w-full bg-primary text-white font-700 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
              >
                <Star className="w-4 h-4 fill-white text-white" />
                Leave a Review
              </button>
            </div>
        }

          <ReviewModal
            isOpen={showReviewModal}
            onClose={() => setShowReviewModal(false)}
            vendorName={primaryChef.name}
            vendorAvatar={primaryChef.avatar}
            dishes={cart.map((item) => ({
              id: item.id,
              title: item.title,
              image: item.image,
              imageAlt: item.imageAlt,
            }))}
          />
        </div>
      }
    </div>);

}