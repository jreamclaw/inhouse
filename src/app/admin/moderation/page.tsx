'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ModerationReportRow {
  id: string;
  reporter_id: string;
  target_user_id: string | null;
  target_type: 'user' | 'post' | 'story' | 'comment';
  target_id: string | null;
  reason: string;
  details: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
  reporter?: {
    full_name: string | null;
    username: string | null;
    email?: string | null;
  } | null;
  target_user?: {
    full_name: string | null;
    username: string | null;
  } | null;
}

const STATUS_OPTIONS: ModerationReportRow['status'][] = ['open', 'reviewing', 'resolved', 'dismissed'];

export default function AdminModerationPage() {
  const supabase = createClient();
  const [reports, setReports] = useState<ModerationReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    void loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const userResult = await supabase.auth.getUser();
      const email = userResult.data.user?.email || '';
      if (!['support@inhouseapp.net', 'admin@inhouseapp.net', 'inhouseappadmin@gmail.com'].includes(email)) {
        setAccessDenied('Admin access only.');
        setLoading(false);
        return;
      }

      setAdminEmail(email);

      const response = await fetch('/api/admin/moderation-reports/list', {
        method: 'GET',
        cache: 'no-store',
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load moderation reports.');
      }

      setReports(((payload?.reports || []) as ModerationReportRow[]));
    } catch (error: any) {
      setAccessDenied(error?.message || 'Unable to load moderation reports.');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (reportId: string, status: ModerationReportRow['status']) => {
    setSavingId(reportId);
    try {
      const response = await fetch('/api/admin/moderation-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Failed to update report.');

      setReports((prev) => prev.map((report) => report.id === reportId ? { ...report, status } : report));
      toast.success(`Report marked ${status}.`);
    } catch (error: any) {
      toast.error(error?.message || 'Could not update report.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">Moderation Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Review user, post, story, and comment reports submitted in the app.</p>
          {adminEmail ? <p className="text-xs text-muted-foreground mt-2">Signed in as {adminEmail} · {reports.length} report{reports.length === 1 ? '' : 's'}</p> : null}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-border bg-card p-8 flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading reports...
          </div>
        ) : accessDenied ? (
          <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-6 text-sm text-destructive">
            {accessDenied}
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground flex items-center gap-3">
            <ShieldAlert className="w-4 h-4" /> No moderation reports yet.
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="rounded-3xl border border-border bg-card p-5 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {report.target_type} report
                      </span>
                      <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold capitalize text-muted-foreground">
                        {report.status}
                      </span>
                    </div>
                    <p className="text-base font-700 text-foreground">{report.reason}</p>
                    <p className="text-sm text-muted-foreground">
                      Reporter: {report.reporter?.full_name || report.reporter?.username || report.reporter_id}
                      {report.reporter?.username ? ` (@${report.reporter.username})` : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Target: {report.target_user?.full_name || report.target_user?.username || report.target_user_id || report.target_id || 'Unknown'}
                      {report.target_user?.username ? ` (@${report.target_user.username})` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">Submitted {new Date(report.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {report.details ? (
                  <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm text-foreground leading-relaxed">
                    {report.details}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      onClick={() => updateStatus(report.id, status)}
                      disabled={savingId === report.id || report.status === status}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                        status === 'resolved'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : status === 'dismissed'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : status === 'reviewing'
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-muted text-foreground hover:bg-border'
                      }`}
                    >
                      {savingId === report.id && report.status !== status ? <Loader2 className="w-4 h-4 animate-spin" /> : status === 'resolved' ? <CheckCircle2 className="w-4 h-4" /> : status === 'dismissed' ? <XCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
