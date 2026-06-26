import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolvePostLoginRoute } from '@/lib/auth/routeResolver';

export default async function RootPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, onboarding_complete, vendor_onboarding_complete')
    .eq('id', user.id)
    .maybeSingle();

  const { destination } = resolvePostLoginRoute(
    profile ?? {
      role: null,
      onboarding_complete: false,
      vendor_onboarding_complete: false,
    }
  );

  redirect(destination);
}
