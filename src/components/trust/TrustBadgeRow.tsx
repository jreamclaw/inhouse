'use client';

import { useMemo, useState } from 'react';
import { Award, BadgeCheck, ShieldCheck, Sparkles, Star, UserCheck } from 'lucide-react';
import { ChefBadgeType, TrustCredentialShape, TrustProfileShape } from '@/lib/trust/types';
import { getAllBadgeDetails } from '@/lib/trust/badgeDetails';
import BadgeDetailsModal from './BadgeDetailsModal';

const BADGE_META: Record<ChefBadgeType, { label: string; icon: any; className: string; mutedClassName: string }> = {
  verified_identity: { label: 'Verified Identity', icon: UserCheck, className: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900', mutedClassName: 'bg-muted text-muted-foreground border border-border' },
  certified: { label: 'Certified', icon: BadgeCheck, className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20', mutedClassName: 'bg-muted text-muted-foreground border border-border' },
  licensed_business: { label: 'Licensed', icon: ShieldCheck, className: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20', mutedClassName: 'bg-muted text-muted-foreground border border-border' },
  top_rated: { label: 'Top Rated', icon: Star, className: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20', mutedClassName: 'bg-muted text-muted-foreground border border-border' },
  pro_chef: { label: 'Pro Chef', icon: Sparkles, className: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20', mutedClassName: 'bg-muted text-muted-foreground border border-border' },
  new_chef: { label: 'New Chef', icon: Award, className: 'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700', mutedClassName: 'bg-muted text-muted-foreground border border-border' },
};

export default function TrustBadgeRow({
  badges,
  compact = false,
  showLocked = false,
  profile,
  credentials = [],
  limit,
}: {
  badges: ChefBadgeType[];
  compact?: boolean;
  showLocked?: boolean;
  profile?: TrustProfileShape;
  credentials?: TrustCredentialShape[];
  limit?: number;
}) {
  const [selectedBadgeType, setSelectedBadgeType] = useState<ChefBadgeType | null>(null);

  const badgeDetails = useMemo(() => {
    if (showLocked && profile) return getAllBadgeDetails(profile, credentials);
    return badges.map((badge) => ({
      type: badge,
      label: BADGE_META[badge].label,
      shortLabel: BADGE_META[badge].label,
      description: BADGE_META[badge].label,
      icon: BADGE_META[badge].icon,
      earned: true,
      requirements: [],
      nextSteps: [],
      className: BADGE_META[badge].className,
      mutedClassName: BADGE_META[badge].mutedClassName,
    }));
  }, [showLocked, profile, credentials, badges]);

  const visibleBadges = typeof limit === 'number' ? badgeDetails.slice(0, limit) : badgeDetails;
  const selectedBadge = badgeDetails.find((badge) => badge.type === selectedBadgeType) || null;

  if (!visibleBadges.length) return null;

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${compact ? 'gap-1.5' : ''}`}>
        {visibleBadges.map((badge) => {
          const meta = BADGE_META[badge.type];
          const Icon = meta.icon;
          return (
            <button
              type="button"
              key={badge.type}
              onClick={() => setSelectedBadgeType(badge.type)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.earned ? meta.className : meta.mutedClassName}`}
              title={badge.label}
            >
              <Icon className="w-3.5 h-3.5" />
              {compact ? badge.shortLabel : badge.label}
            </button>
          );
        })}
      </div>
      <BadgeDetailsModal badge={selectedBadge as any} onClose={() => setSelectedBadgeType(null)} />
    </>
  );
}
