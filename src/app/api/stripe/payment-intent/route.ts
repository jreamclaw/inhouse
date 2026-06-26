import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getStripeServer } from '@/lib/stripe';

type PaymentIntentRequest = {
  chefId?: string;
  subtotal?: number;
  deliveryFee?: number;
  serviceFee?: number;
  promoDiscount?: number;
  total?: number;
};

export async function POST(request: Request) {
  try {
    const stripe = getStripeServer();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured yet.' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as PaymentIntentRequest;
    const chefId = body.chefId;
    const subtotal = Number(body.subtotal || 0);
    const deliveryFee = Number(body.deliveryFee || 0);
    const serviceFee = Number(body.serviceFee || 0);
    const promoDiscount = Number(body.promoDiscount || 0);
    const total = Number(body.total || 0);

    if (!chefId) {
      return NextResponse.json({ error: 'Missing chef id.' }, { status: 400 });
    }

    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ error: 'Invalid order total.' }, { status: 400 });
    }

    const customerServiceFee = subtotal > 0 ? Number((subtotal * 0.06).toFixed(2)) : 0;
    const chefPlatformFee = subtotal > 0 ? Number((subtotal * 0.06).toFixed(2)) : 0;
    const totalPlatformFee = Number((customerServiceFee + chefPlatformFee).toFixed(2));
    const expectedTotal = Number((subtotal + deliveryFee + customerServiceFee - promoDiscount).toFixed(2));

    if (Math.abs(serviceFee - customerServiceFee) > 0.01) {
      return NextResponse.json({ error: 'Checkout service fee is out of sync. Please refresh and try again.' }, { status: 400 });
    }

    if (Math.abs(total - expectedTotal) > 0.01) {
      return NextResponse.json({ error: 'Checkout total is out of sync. Please refresh and try again.' }, { status: 400 });
    }

    const amount = Math.round(total * 100);

    const { data: chefProfile, error: chefError } = await supabase
      .from('user_profiles')
      .select('id, full_name, stripe_account_id, stripe_charges_enabled')
      .eq('id', chefId)
      .maybeSingle();

    if (chefError) {
      return NextResponse.json({ error: chefError.message || 'Failed to load chef payout profile.' }, { status: 500 });
    }

    if (!chefProfile?.stripe_account_id) {
      return NextResponse.json({ error: 'Chef payout account is not connected yet.' }, { status: 400 });
    }

    if (!chefProfile.stripe_charges_enabled) {
      return NextResponse.json({ error: 'Chef payouts are not ready to accept payments yet.' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        customer_id: user.id,
        chef_id: chefId,
        subtotal: subtotal.toFixed(2),
        delivery_fee: deliveryFee.toFixed(2),
        service_fee: serviceFee.toFixed(2),
        chef_platform_fee: chefPlatformFee.toFixed(2),
        total_platform_fee: totalPlatformFee.toFixed(2),
        promo_discount: Math.abs(promoDiscount).toFixed(2),
        total: total.toFixed(2),
      },
      application_fee_amount: Math.max(0, Math.round(totalPlatformFee * 100)),
      transfer_data: {
        destination: chefProfile.stripe_account_id,
      },
      receipt_email: user.email || undefined,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create payment intent.' }, { status: 500 });
  }
}
