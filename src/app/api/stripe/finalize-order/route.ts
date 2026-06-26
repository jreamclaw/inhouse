import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getStripeServer } from '@/lib/stripe';

type FinalizeOrderRequest = {
  chefId?: string;
  fulfillment?: 'pickup' | 'delivery';
  customerName?: string;
  customerPhone?: string;
  address?: string | null;
  apt?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  instructions?: string | null;
  deliveryTime?: string | null;
  subtotal?: number;
  deliveryFee?: number;
  serviceFee?: number;
  promoDiscount?: number;
  total?: number;
  platformFeeRate?: number;
  platformFee?: number;
  chefEarnings?: number;
  paymentIntentId?: string;
  paymentMethodLast4?: string | null;
  cart?: Array<{
    mealId?: string | null;
    title?: string;
    description?: string;
    image?: string;
    qty?: number;
    unitPrice?: number;
    lineTotal?: number;
  }>;
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

    const body = (await request.json()) as FinalizeOrderRequest;
    const paymentIntentId = body.paymentIntentId;
    const chefId = body.chefId;
    const cart = Array.isArray(body.cart) ? body.cart : [];

    if (!paymentIntentId || !chefId || cart.length === 0) {
      return NextResponse.json({ error: 'Missing required order details.' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['payment_method'],
    });

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment has not succeeded yet.' }, { status: 400 });
    }

    if (paymentIntent.metadata?.customer_id !== user.id) {
      return NextResponse.json({ error: 'Payment does not belong to this customer.' }, { status: 403 });
    }

    if (paymentIntent.metadata?.chef_id !== chefId) {
      return NextResponse.json({ error: 'Payment chef mismatch.' }, { status: 400 });
    }

    const existingOrder = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (existingOrder.data?.id) {
      return NextResponse.json({ orderId: existingOrder.data.id });
    }

    const subtotal = Number(body.subtotal || 0);
    const deliveryFee = Number(body.deliveryFee || 0);
    const serviceFee = Number(body.serviceFee || 0);
    const promoDiscount = Number(body.promoDiscount || 0);
    const total = Number(body.total || 0);
    const platformFeeRate = Number(body.platformFeeRate || 0);
    const platformFee = Number(body.platformFee || 0);
    const chefEarnings = Number(body.chefEarnings || 0);

    const expectedServiceFee = subtotal > 0 ? Number((subtotal * 0.06).toFixed(2)) : 0;
    const expectedChefPlatformFee = subtotal > 0 ? Number((subtotal * 0.06).toFixed(2)) : 0;
    const expectedPlatformFee = Number((expectedServiceFee + expectedChefPlatformFee).toFixed(2));
    const expectedChefEarnings = Number((subtotal - expectedChefPlatformFee).toFixed(2));
    const expectedPlatformFeeRate = 0.12;
    const expectedTotalValue = Number((subtotal + deliveryFee + expectedServiceFee - promoDiscount).toFixed(2));

    if (Math.abs(serviceFee - expectedServiceFee) > 0.01) {
      return NextResponse.json({ error: 'Order service fee does not match current marketplace pricing.' }, { status: 400 });
    }

    if (Math.abs(platformFee - expectedPlatformFee) > 0.01) {
      return NextResponse.json({ error: 'Platform fee does not match current marketplace pricing.' }, { status: 400 });
    }

    if (Math.abs(chefEarnings - expectedChefEarnings) > 0.01) {
      return NextResponse.json({ error: 'Chef payout amount does not match current marketplace pricing.' }, { status: 400 });
    }

    if (Math.abs(platformFeeRate - expectedPlatformFeeRate) > 0.0001) {
      return NextResponse.json({ error: 'Platform fee rate does not match current marketplace pricing.' }, { status: 400 });
    }

    if (Math.abs(total - expectedTotalValue) > 0.01) {
      return NextResponse.json({ error: 'Order total does not match current marketplace pricing.' }, { status: 400 });
    }

    const expectedAmount = Math.round(total * 100);
    if (!Number.isFinite(total) || total <= 0 || paymentIntent.amount !== expectedAmount) {
      return NextResponse.json({ error: 'Paid amount does not match the order total.' }, { status: 400 });
    }

    const { data: orderRow, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: user.id,
        chef_id: chefId,
        status: 'pending',
        fulfillment_type: body.fulfillment || 'delivery',
        customer_name: body.customerName || user.email || '',
        customer_phone: body.customerPhone || '',
        address: body.fulfillment === 'delivery' ? body.address || null : null,
        apt: body.fulfillment === 'delivery' ? body.apt || null : null,
        city: body.fulfillment === 'delivery' ? body.city || null : null,
        state: body.fulfillment === 'delivery' ? body.state || null : null,
        zip: body.fulfillment === 'delivery' ? body.zip || null : null,
        instructions: body.instructions || null,
        delivery_time: body.deliveryTime || null,
        subtotal,
        delivery_fee: deliveryFee,
        service_fee: serviceFee,
        promo_discount: promoDiscount,
        total,
        payment_status: 'paid',
        stripe_payment_intent_id: paymentIntentId,
        payment_method_last4: body.paymentMethodLast4 || null,
      })
      .select('id, status')
      .single();

    if (orderError || !orderRow?.id) {
      return NextResponse.json({ error: orderError?.message || 'Could not create order.' }, { status: 500 });
    }

    const orderItemsPayload = cart.map((item) => ({
      order_id: orderRow.id,
      meal_id: item.mealId || null,
      meal_title: item.title || 'Meal',
      meal_description: item.description || '',
      meal_image_url: item.image || '',
      unit_price: Number(item.unitPrice || 0),
      qty: Number(item.qty || 0),
      line_total: Number(item.lineTotal || 0),
      customizations: [],
      notes: null,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);
    if (itemsError) {
      return NextResponse.json({ error: itemsError.message || 'Could not save order items.' }, { status: 500 });
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
        platform_fee_rate: platformFeeRate,
        platform_fee: platformFee,
        chef_earnings: chefEarnings,
        total,
        promo_discount: promoDiscount,
        status: 'paid',
      });

    if (revenueError) {
      return NextResponse.json({ error: revenueError.message || 'Could not save order revenue.' }, { status: 500 });
    }

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
        title: 'New paid order received',
        body: `${body.customerName || user.email || 'A customer'} placed a paid order.`,
        entity_id: orderRow.id,
        entity_type: 'order',
      });
    }

    return NextResponse.json({ orderId: orderRow.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to finalize order.' }, { status: 500 });
  }
}
