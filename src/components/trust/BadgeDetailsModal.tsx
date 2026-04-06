'use client';

import { X } from 'lucide-react';
import type { BadgeDetail } from '@/lib/trust/badgeDetails';

export default function BadgeDetailsModal({ badge, onClose }: { badge: BadgeDetail | null; onClose: () => void }) {
  if (!badge) return null;

  const Icon = badge.icon;

  return (
    <div className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-background border border-border p-5 sm:p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${badge.earned ? badge.className : badge.mutedClassName}`}>
              <Icon className="w-4 h-4" />
              {badge.label}
            </div>
            <h3 className="mt-3 text-xl font-bold text-foreground">{badge.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{badge.description}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</p>
            <p className={`mt-2 text-sm font-semibold ${badge.earned ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {badge.earned ? 'Earned' : 'Locked'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{badge.progressText}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-2">Requirements</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {badge.requirements.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-2">What to do next</p>
            {badge.nextSteps.length > 0 ? (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {badge.nextSteps.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">This badge is already earned.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
