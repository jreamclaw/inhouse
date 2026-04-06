import Link from 'next/link';
import { FileBadge2, FileCheck2, FileText, ShieldCheck } from 'lucide-react';
import TrustBadgeRow from './TrustBadgeRow';
import TrustMeter from './TrustMeter';
import { CredentialStatus, TrustCredentialShape, TrustScoreResult } from '@/lib/trust/types';
import { isCredentialExpired } from '@/lib/trust/score';

function statusLabel(status: CredentialStatus | string, expirationDate?: string | null) {
  if (status === 'approved' && isCredentialExpired(expirationDate)) return 'expired';
  return status;
}

export default function TrustVerificationSection({
  score,
  credentials,
  canManage,
}: {
  score: TrustScoreResult;
  credentials: Array<TrustCredentialShape & { id?: string; title?: string | null; issued_by?: string | null; expiration_date?: string | null }>;
  canManage?: boolean;
}) {
  const approvedCredentials = credentials.filter((credential) => credential.status === 'approved' && !isCredentialExpired(credential.expiration_date));

  return (
    <section className="rounded-3xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trust & Verification</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">Verified by InHouse</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Customers can quickly see verified identity signals, approved credentials, and platform trust signals before they book.
          </p>
        </div>
        {canManage && (
          <Link href="/chef-menu?section=trust" className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors">
            Manage trust docs
          </Link>
        )}
      </div>

      <TrustBadgeRow badges={score.badges} />
      <TrustMeter score={score.score} label={score.label} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<ShieldCheck className="w-4 h-4" />} label="Trust label" value={score.label} />
        <MetricCard icon={<FileBadge2 className="w-4 h-4" />} label="Approved credentials" value={String(score.approvedCredentials)} />
        <MetricCard icon={<FileCheck2 className="w-4 h-4" />} label="Certificates" value={String(score.approvedCertificates)} />
        <MetricCard icon={<FileText className="w-4 h-4" />} label="Licenses / permits" value={String(score.approvedLicenses)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-border bg-muted/20 p-4">
          <p className="text-sm font-semibold text-foreground mb-3">Verification checklist</p>
          <div className="space-y-2.5">
            {score.checklist.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <p className="text-sm text-foreground">{item.label}</p>
                <span className={`text-xs font-semibold ${item.earned ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  {item.earned ? `+${item.points}` : '+0'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted/20 p-4">
          <p className="text-sm font-semibold text-foreground mb-3">Approved credentials</p>
          {approvedCredentials.length > 0 ? (
            <div className="space-y-2.5">
              {approvedCredentials.map((credential, index) => (
                <div key={credential.id || `${credential.credential_type}-${index}`} className="rounded-xl border border-border bg-card px-3 py-2.5">
                  <p className="text-sm font-semibold text-foreground">{credential.title || credential.credential_type}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{credential.issued_by || 'Issued credential'}</span>
                    <span className="capitalize">{statusLabel(credential.status, credential.expiration_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No approved credentials published yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
