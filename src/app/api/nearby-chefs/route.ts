import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, bio, location, avatar_url, latitude, longitude, service_radius_miles, business_hours, availability_override, trust_score, trust_label, approved_credentials_count, email_verified, phone_verified, identity_verified, completed_orders, complaints_count, rating_avg, rating_count, is_verified, is_certified, is_licensed, is_top_rated, is_pro_chef, role, vendor_onboarding_complete, updated_at')
      .eq('role', 'chef')
      .eq('vendor_onboarding_complete', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to load nearby chefs.' }, { status: 500 });
    }

    const rows = (data ?? []) as any[];
    const targetChefId = '388eda79-4a09-44f2-88e5-ea1296d47f0d';

    return NextResponse.json({
      chefs: rows,
      debug: {
        rawChefCount: rows.length,
        targetChefInServerRaw: rows.some((row) => row.id === targetChefId),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load nearby chefs.' }, { status: 500 });
  }
}
