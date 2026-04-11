import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getStripeServer } from '@/lib/stripe';

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
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, stripe_account_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError && String(profileError.message || '').includes('stripe_account_id')) {
      return NextResponse.json({
        connected: false,
        stripe_account_id: null,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        onboarding_complete: false,
        error: 'Stripe payout fields are not live in the database yet.',
      });
    }

    if (profileError) {
      return NextResponse.json({ error: profileError.message || 'Failed to load profile.' }, { status: 500 });
    }

    if (!profile?.stripe_account_id) {
      await supabase
        .from('user_profiles')
        .update({
          stripe_onboarding_complete: false,
          stripe_charges_enabled: false,
          stripe_payouts_enabled: false,
        })
        .eq('id', user.id);

      return NextResponse.json({
        connected: false,
        stripe_account_id: null,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        onboarding_complete: false,
      });
    }

    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    const details_submitted = Boolean(account.details_submitted);
    const stripe_connected = Boolean(profile.stripe_account_id);
    const stripe_onboarding_complete = Boolean(details_submitted && account.charges_enabled && account.payouts_enabled);
    const stripe_charges_enabled = Boolean(account.charges_enabled);
    const stripe_payouts_enabled = Boolean(account.payouts_enabled);

    await supabase
      .from('user_profiles')
      .update({
        stripe_onboarding_complete,
        stripe_charges_enabled,
        stripe_payouts_enabled,
      })
      .eq('id', user.id);

    return NextResponse.json({
      connected: stripe_connected,
      stripe_account_id: profile.stripe_account_id,
      charges_enabled: stripe_charges_enabled,
      payouts_enabled: stripe_payouts_enabled,
      details_submitted,
      onboarding_complete: stripe_onboarding_complete,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to sync Stripe status.' }, { status: 500 });
  }
}
