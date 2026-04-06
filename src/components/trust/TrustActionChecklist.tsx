import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Circle } from 'lucide-react';
import type { TrustScoreResult } from '@/lib/trust/types';
import { getNextTrustStep } from '@/lib/trust/progress';

export default function TrustActionChecklist({ score, manageHref = '/chef-menu?section=trust' }: { score: TrustScoreResult; manageHref?: string }) {
  const nextStep = getNextTrustStep(score);

  return (
    <div className="rounded-3xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Increase your trust score</p>
          <h3 className="mt-1 text-lg font-bold text-foreground">Recommended actions</h3>
          <p className="mt-1 text-sm text-muted-foreground">Complete more trust signals to unlock badges and improve visibility.</p>
        </div>
        <Link href={manageHref} className="inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors">
          Manage
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {nextStep && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Next recommended step</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{nextStep.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{nextStep.description} • +{nextStep.points} trust points</p>
        </div>
      )}

      <div className="space-y-2.5">
        {score.checklist.map((item) => (
          <div key={item.key} className={`rounded-2xl border px-3.5 py-3 transition-all ${item.earned ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-muted/20'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {item.earned ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" /> : <Circle className="w-4 h-4 text-muted-foreground mt-0.5" />}
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  {item.description && <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>}
                </div>
              </div>
              <span className={`text-xs font-semibold ${item.earned ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                {item.earned ? `+${item.points}` : `+${item.points}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
