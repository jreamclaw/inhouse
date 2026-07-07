import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const reportId = typeof body?.reportId === 'string' ? body.reportId : '';
    const status = typeof body?.status === 'string' ? body.status : '';

    if (!reportId || !['open', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('content_reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', reportId);

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to update report.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update report.' }, { status: 500 });
  }
}
