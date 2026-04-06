'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllBadgeDetails } from '@/lib/trust/badgeDetails';
import type { TrustCredentialShape, TrustProfileShape } from '@/lib/trust/types';
import BadgeDetailsModal from '@/components/trust/BadgeDetailsModal';

export default function BadgesPage() {
  const { profile } = useAuth();
  const [selectedBadgeType, setSelectedBadgeType] = useState<string | null>(null);

  const badgeDetails = useMemo(
    () => getAllBadgeDetails((profile || {}) as TrustProfileShape, [] as TrustCredentialShape[]),
    [profile],
  );

  const selectedBadge = badgeDetails.find((badge) => badge.type === selectedBadgeType) || null;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/profile-screen" className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">All Badges</h1>
            <p className="text-sm text-muted-foreground">See every InHouse trust badge, what it means, and how to earn it.</p>
          </div>
        </div>

        <div className="grid gap-4">
          {badgeDetails.map((badge) => {
            const Icon = badge.icon;
            return (
              <button
                key={badge.type}
                onClick={() => setSelectedBadgeType(badge.type)}
                className="w-full rounded-3xl border border-border bg-card p-5 text-left hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${badge.earned ? badge.className : badge.mutedClassName}`}>
                      <Icon className="w-4 h-4" />
                      {badge.label}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{badge.description}</p>
                  </div>
                  <span className={`text-xs font-semibold ${badge.earned ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {badge.earned ? 'Earned' : 'Locked'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <BadgeDetailsModal badge={selectedBadge} onClose={() => setSelectedBadgeType(null)} />
    </AppLayout>
  );
}
