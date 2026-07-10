import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

function isAdminEmail(email?: string | null) {
  return ['support@inhouseapp.net', 'admin@inhouseapp.net', 'inhouseappadmin@gmail.com'].includes(email || '');
}

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

export async function GET() {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
      .from('content_reports')
      .select(`
        id,
        reporter_id,
        target_user_id,
        target_type,
        target_id,
        reason,
        details,
        status,
        created_at,
        reporter:reporter_id (
          full_name,
          username,
          email
        ),
        target_user:target_user_id (
          full_name,
          username
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message || 'Unable to load reports.' }, { status: 500 });
    }

    const rows = ((data || []) as any[]).map((row) => ({
      ...row,
      reporter: Array.isArray(row.reporter) ? row.reporter[0] : row.reporter,
      target_user: Array.isArray(row.target_user) ? row.target_user[0] : row.target_user,
    }));

    return NextResponse.json({ reports: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to load reports.' }, { status: 500 });
  }
}
