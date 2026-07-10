import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { ADMIN_EMAILS, isAdminEmail } from '@/lib/admin';

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const targetType = typeof body?.targetType === 'string' ? body.targetType : 'content';
    const reason = typeof body?.reason === 'string' ? body.reason : 'A user submitted a report for review.';
    const targetId = typeof body?.targetId === 'string' ? body.targetId : null;

    const adminSupabase = createAdminClient();

    const { data: reporterProfile } = await adminSupabase
      .from('user_profiles')
      .select('full_name, username, email')
      .eq('id', user.id)
      .maybeSingle();

    const { data: adminUsers, error: adminUsersError } = await adminSupabase
      .from('user_profiles')
      .select('id, email')
      .in('email', [...ADMIN_EMAILS]);

    if (adminUsersError) {
      return NextResponse.json({ error: adminUsersError.message || 'Failed to load admin users.' }, { status: 500 });
    }

    const reporterName = reporterProfile?.username
      ? `@${reporterProfile.username}`
      : reporterProfile?.full_name || reporterProfile?.email || 'A user';

    const title = `New ${targetType} report`;
    const notificationBody = `${reporterName} reported ${targetType} content for review. Reason: ${reason}`;

    const notifications = (adminUsers || [])
      .filter((admin) => admin?.id)
      .map((admin) => ({
        user_id: admin.id,
        actor_id: user.id,
        type: 'tag',
        title,
        body: notificationBody,
        entity_id: targetId,
        entity_type: 'moderation_report',
      }));

    if (notifications.length > 0) {
      const { error } = await adminSupabase.from('notifications').insert(notifications);
      if (error) {
        return NextResponse.json({ error: error.message || 'Failed to notify admins.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, notifiedAdmins: notifications.length, isAdminReporter: isAdminEmail(user.email) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to notify admins.' }, { status: 500 });
  }
}
