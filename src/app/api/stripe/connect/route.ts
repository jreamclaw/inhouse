import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getStripeServer } from '@/lib/stripe';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://inhouseapp.net').replace(/\/+$/, '');

export async function POST() {
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
          setAll() {
            // no-op for API response path
          },
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

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message || 'Failed to load profile' }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: `Profile not found for user ${user.id}` }, { status: 404 });
    }

    let stripeAccountId: string | null = null;

    const stripeFieldLookup = await supabase
      .from('user_profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .maybeSingle();

    if (stripeFieldLookup.error && String(stripeFieldLookup.error.message || '').includes('stripe_account_id')) {
      return NextResponse.json({ error: 'Stripe payout fields are not live in the database yet. Apply the Stripe profile migrations first.' }, { status: 500 });
    }

    if (!stripeFieldLookup.error) {
      stripeAccountId = stripeFieldLookup.data?.stripe_account_id ?? null;
    }

    if (!stripeAccountId) {
      let account;
      try {
        account = await stripe.accounts.create({
          type: 'express',
          email: profile.email || user.email || undefined,
          business_type: 'individual',
          business_profile: {
            name: profile.full_name || 'InHouse Chef',
          },
        });
      } catch (createError: any) {
        return NextResponse.json({
          error: createError?.message || 'Unable to create Stripe Connect account.',
          code: createError?.code || null,
          type: createError?.type || null,
        }, { status: 500 });
      }

      stripeAccountId = account.id;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', user.id);

      if (updateError && !String(updateError.message || '').includes('stripe_account_id')) {
        return NextResponse.json({ error: updateError.message || 'Failed to save Stripe account' }, { status: 500 });
      }
    }

    const payoutReturnUrl = `${APP_URL}/chef-menu?section=payouts`;

    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: payoutReturnUrl,
      return_url: payoutReturnUrl,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: link.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create Stripe onboarding link.' },
      { status: 500 }
    );
  }
}
