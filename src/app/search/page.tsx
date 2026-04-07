'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, ChefHat, UserRound, Loader2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchUser {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: 'chef' | 'customer' | null;
}

export default function SearchPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);

  const normalizedQuery = useMemo(() => query.trim().replace(/^@+/, ''), [query]);

  useEffect(() => {
    if (!user?.id || normalizedQuery.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      runSearch();
    }, 180);

    return () => clearTimeout(timeout);
  }, [user?.id, normalizedQuery]);

  const runSearch = async () => {
    if (!normalizedQuery || normalizedQuery.length < 2) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, username, avatar_url, bio, role')
        .or(`username.ilike.%${normalizedQuery}%,full_name.ilike.%${normalizedQuery}%`)
        .neq('id', user?.id || '')
        .limit(20);

      if (error) throw error;
      setResults((data || []) as SearchUser[]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/home-feed" className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-700 text-foreground">Search people</h1>
            <p className="text-sm text-muted-foreground">Find users by name or @username</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or @username"
            className="w-full rounded-2xl border border-border bg-card pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>

        {normalizedQuery.length > 0 && normalizedQuery.length < 2 && (
          <p className="text-xs text-muted-foreground">Type at least 2 characters.</p>
        )}

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Searching...
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            {results.map((person) => {
              const cardInner = (
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt={person.full_name || person.username || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-700 text-foreground">{(person.full_name || person.username || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-700 text-foreground truncate">{person.full_name || person.username || 'User'}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${person.role === 'chef' ? 'bg-orange-500/10 text-orange-600' : 'bg-muted text-muted-foreground'}`}>
                        {person.role === 'chef' ? <ChefHat className="w-3 h-3" /> : <UserRound className="w-3 h-3" />}
                        {person.role === 'chef' ? 'Chef' : 'User'}
                      </span>
                    </div>
                    {person.username && <p className="text-xs text-muted-foreground mt-0.5">@{person.username}</p>}
                    {person.bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{person.bio}</p>}
                    {person.role !== 'chef' && <p className="text-[11px] text-muted-foreground mt-2">Public customer profiles are coming next.</p>}
                  </div>
                </div>
              );

              const href = person.role === 'chef' ? `/vendor-profile?id=${person.id}` : `/profile/${person.id}`;

              return (
                <Link key={person.id} href={href} className="block rounded-2xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all">
                  {cardInner}
                </Link>
              );
            })}
          </div>
        ) : normalizedQuery.length >= 2 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm font-700 text-foreground">No people found</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different name or username.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm font-700 text-foreground">Search by name or username</p>
            <p className="text-sm text-muted-foreground mt-1">Use full names or @usernames to quickly find people.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
