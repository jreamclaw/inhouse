import { Shield } from 'lucide-react';
import { TrustLabel } from '@/lib/trust/types';

export default function TrustMeter({ score, label }: { score: number; label: TrustLabel | string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Trust score</p>
            <p className="text-xs text-muted-foreground">Verified by InHouse signals</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{score}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-zinc-900 via-zinc-700 to-amber-500 dark:from-white dark:via-zinc-300 dark:to-amber-400" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}
