'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldBan, UserX } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BlockedUserRow {
  id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
  blocked_user: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export default function BlockedUsersPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserRow[]>([]);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    void loadBlockedUsers();
  }, [user, router]);

  const loadBlockedUsers = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select(`
          id,
          blocked_id,
          reason,
          created_at,
          blocked_user:blocked_id (
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = ((data || []) as any[]).map((row) => ({
        ...row,
        blocked_user: Array.isArray(row.blocked_user) ? row.blocked_user[0] : row.blocked_user,
      }));

      setBlockedUsers(rows as BlockedUserRow[]);
    } catch (error: any) {
      toast.error(error?.message || 'Could not load blocked users.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockId: string, label: string) => {
    setUnblockingId(blockId);
    try {
      const { error } = await supabase.from('user_blocks').delete().eq('id', blockId);
      if (error) throw error;

      setBlockedUsers((prev) => prev.filter((row) => row.id !== blockId));
      toast.success(`${label} has been unblocked.`);
    } catch (error: any) {
      toast.error(error?.message || 'Could not unblock user.');
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto xl:max-w-screen-lg xl:mx-0 xl:px-6 2xl:px-10">
        <div className="sticky top-14 z-30 bg-card/95 backdrop-blur-md border-b border-border/60 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <h1 className="text-base font-700 text-foreground">Blocked Users</h1>
        </div>

        <div className="px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading blocked users...</span>
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <ShieldBan className="w-6 h-6 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-700 text-foreground">No blocked users</h2>
              <p className="mt-2 text-sm text-muted-foreground">If you block someone, they’ll show up here so you can review or unblock them later.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {blockedUsers.map((entry) => {
                const label = entry.blocked_user?.username ? `@${entry.blocked_user.username}` : entry.blocked_user?.full_name || 'Blocked user';
                const avatarFallback = (entry.blocked_user?.full_name || entry.blocked_user?.username || 'U').charAt(0).toUpperCase();

                return (
                  <div key={entry.id} className="rounded-3xl border border-border bg-card p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                      {entry.blocked_user?.avatar_url ? (
                        <img src={entry.blocked_user.avatar_url} alt={label} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-700 text-muted-foreground">{avatarFallback}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-700 text-foreground truncate">{entry.blocked_user?.full_name || 'Blocked user'}</p>
                      <p className="text-xs text-muted-foreground truncate">{label}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Blocked {new Date(entry.created_at).toLocaleDateString()}
                        {entry.reason ? ` • ${entry.reason}` : ''}
                      </p>
                    </div>

                    <button
                      onClick={() => handleUnblock(entry.id, label)}
                      disabled={unblockingId === entry.id}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-700 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-60 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
                    >
                      {unblockingId === entry.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                      Unblock
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
