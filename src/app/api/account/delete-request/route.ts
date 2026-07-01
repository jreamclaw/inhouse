import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST() {
  try {
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

    const { data: existing } = await supabase
      .from('account_deletion_requests')
      .select('id, status, requested_at')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyRequested: true,
        requested_at: existing.requested_at,
      });
    }

    const { error } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        email: user.email || null,
        status: 'pending',
      });

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to submit deletion request.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, alreadyRequested: false });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to submit deletion request.' }, { status: 500 });
  }
}
