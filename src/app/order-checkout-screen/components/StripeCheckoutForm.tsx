'use client';

import React, { useMemo, useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Loader2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

type DeliveryValues = {
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

type Props = {
  userId: string;
  customerName: string;
  customerProfileName?: string | null;
  chefId: string;
  fulfillment: 'pickup' | 'delivery';
  cart: CartItem[];
  deliveryValues: DeliveryValues;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  promoDiscount: number;
  total: number;
  platformFeeRate: number;
  platformFee: number;
  chefEarnings: number;
  onSuccess: (result: { orderId: string }) => void;
};

export default function StripeCheckoutForm({
  userId,
  customerName,
  customerProfileName,
  chefId,
  fulfillment,
  cart,
  deliveryValues,
  subtotal,
  deliveryFee,
  serviceFee,
  promoDiscount,
  total,
  platformFeeRate,
  platformFee,
  chefEarnings,
  onSuccess,
}: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const buttonLabel = useMemo(() => `Pay ${total.toFixed(2)} and Place Order`, [total]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast.error('Secure payment form is still loading.');
      return;
    }

    if (!cart.length) {
      toast.error('Your cart is empty.');
      return;
    }

    setSubmitting(true);

    try {
      const submitResult = await elements.submit();
      if (submitResult.error) {
        throw new Error(submitResult.error.message || 'Please check your payment details.');
      }

      const confirmation = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: deliveryValues.fullName || customerProfileName || customerName || undefined,
              phone: deliveryValues.phone || undefined,
              address: fulfillment === 'delivery'
                ? {
                    line1: deliveryValues.address || undefined,
                    line2: deliveryValues.apt || undefined,
                    city: deliveryValues.city || undefined,
                    state: deliveryValues.state || undefined,
                    postal_code: deliveryValues.zip || undefined,
                    country: 'US',
                  }
                : undefined,
            },
          },
        },
      });

      if (confirmation.error) {
        throw new Error(confirmation.error.message || 'Payment confirmation failed.');
      }

      const paymentIntent = confirmation.paymentIntent;
      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        throw new Error('Payment did not complete successfully.');
      }

      const paymentMethod = paymentIntent.payment_method;
      let last4: string | null = null;
      if (typeof paymentMethod === 'object' && paymentMethod && 'card' in paymentMethod) {
        last4 = paymentMethod.card?.last4 ?? null;
      }

      const orderResponse = await fetch('/api/stripe/finalize-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chefId,
          fulfillment,
          customerName: deliveryValues.fullName || customerProfileName || customerName || '',
          customerPhone: deliveryValues.phone || '',
          address: fulfillment === 'delivery' ? deliveryValues.address || null : null,
          apt: fulfillment === 'delivery' ? deliveryValues.apt || null : null,
          city: fulfillment === 'delivery' ? deliveryValues.city || null : null,
          state: fulfillment === 'delivery' ? deliveryValues.state || null : null,
          zip: fulfillment === 'delivery' ? deliveryValues.zip || null : null,
          instructions: deliveryValues.instructions || null,
          deliveryTime: deliveryValues.deliveryTime || null,
          subtotal,
          deliveryFee,
          serviceFee,
          promoDiscount: Math.abs(promoDiscount),
          total,
          platformFeeRate,
          platformFee,
          chefEarnings,
          paymentIntentId: paymentIntent.id,
          paymentMethodLast4: last4,
          cart: cart.map((item) => ({
            mealId: item.mealId || null,
            title: item.title,
            description: item.description,
            image: item.image,
            qty: item.qty,
            unitPrice: item.price,
            lineTotal: +(item.price * item.qty).toFixed(2),
          })),
        }),
      });

      const orderPayload = await orderResponse.json();
      if (!orderResponse.ok || !orderPayload?.orderId) {
        throw new Error(orderPayload?.error || 'Payment succeeded, but the order could not be finalized.');
      }

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('inhouse_checkout_cart');
      }

      toast.success('Payment successful and order placed!');
      onSuccess({ orderId: orderPayload.orderId });
    } catch (error: any) {
      toast.error(error?.message || 'Unable to complete payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full bg-primary text-white font-700 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all duration-150 shadow-lg shadow-primary/20 disabled:opacity-80 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing payment...
          </>
        ) : (
          <>
            <ShoppingBag className="w-5 h-5" />
            {buttonLabel}
          </>
        )}
      </button>
    </form>
  );
}
