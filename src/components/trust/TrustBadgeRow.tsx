import { Award, BadgeCheck, ShieldCheck, Sparkles, Star, UserCheck } from 'lucide-react';
import { ChefBadgeType } from '@/lib/trust/types';

const BADGE_META: Record<ChefBadgeType, { label: string; icon: any; className: string }> = {
  verified_identity: { label: 'Verified Identity', icon: UserCheck, className: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' },
  certified: { label: 'Certified', icon: BadgeCheck, className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20' },
  licensed_business: { label: 'Licensed', icon: ShieldCheck, className: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20' },
  top_rated: { label: 'Top Rated', icon: Star, className: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20' },
  pro_chef: { label: 'Pro Chef', icon: Sparkles, className: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20' },
  new_chef: { label: 'New Chef', icon: Award, className: 'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700' },
};

export default function TrustBadgeRow({ badges, compact = false }: { badges: ChefBadgeType[]; compact?: boolean }) {
  if (!badges.length) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? 'gap-1.5' : ''}`}>
      {badges.map((badge) => {
        const meta = BADGE_META[badge];
        const Icon = meta.icon;
        return (
          <span
            key={badge}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}
