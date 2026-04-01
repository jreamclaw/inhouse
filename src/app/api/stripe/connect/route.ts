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
      .select('id, email, full_name, stripe_account_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message || 'Failed to load profile' }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: `Profile not found for user ${user.id}` }, { status: 404 });
    }

    let stripeAccountId = profile.stripe_account_id;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: profile.email || user.email || undefined,
        business_type: 'individual',
        business_profile: {
          name: profile.full_name || 'InHouse Chef',
        },
      });

      stripeAccountId = account.id;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', user.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message || 'Failed to save Stripe account' }, { status: 500 });
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://inhouseapp.net';

    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${siteUrl}/chef-menu?section=payouts`,
      return_url: `${siteUrl}/chef-menu?section=payouts`,
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
