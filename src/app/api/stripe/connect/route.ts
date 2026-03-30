import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe';

export async function POST() {
  try {
    const stripe = getStripeServer();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured yet.' }, { status: 500 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let stripeAccountId = profile.stripe_account_id;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: profile.email,
        business_type: 'individual',
        business_profile: {
          name: profile.full_name || 'InHouse Chef',
        },
      });

      stripeAccountId = account.id;

      await supabase
        .from('user_profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', user.id);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://inhouseapp.net';

    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${siteUrl}/chef-menu`,
      return_url: `${siteUrl}/chef-menu`,
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
