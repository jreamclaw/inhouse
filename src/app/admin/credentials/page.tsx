'use client';

import { useEffect, useState } from 'react';
import { Check, Eye, Loader2, ShieldX, X, FileWarning } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ReviewCredentialRow {
  id: string;
  chef_id: string;
  credential_type: string;
  title: string;
  file_url: string;
  file_name: string;
  file_path: string;
  file_bucket: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  issued_by: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  review_notes: string | null;
  chef: {
    full_name: string | null;
    username: string | null;
  } | null;
}

export default function AdminCredentialReviewPage() {
  const supabase = createClient();
  const [credentials, setCredentials] = useState<ReviewCredentialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [accessDenied, setAccessDenied] = useState('');

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const userResult = await supabase.auth.getUser();
      const email = userResult.data.user?.email || '';
      if (!['support@inhouseapp.net', 'admin@inhouseapp.net'].includes(email)) {
        setAccessDenied('Admin access only.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('chef_credentials')
        .select(`
          id,
          chef_id,
          credential_type,
          title,
          file_url,
          file_name,
          file_path,
          file_bucket,
          status,
          issued_by,
          issue_date,
          expiration_date,
          review_notes,
          chef:user_profiles!chef_credentials_chef_id_fkey (
            full_name,
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data || []).map((row: any) => ({
        ...row,
        chef: Array.isArray(row.chef) ? row.chef[0] : row.chef,
      }));
      setCredentials(rows);
      setNotesById(Object.fromEntries(rows.map((row: ReviewCredentialRow) => [row.id, row.review_notes || ''])));
    } catch (error: any) {
      setAccessDenied(error?.message || 'Unable to load credentials.');
    } finally {
      setLoading(false);
    }
  };

  const openCredentialPreview = async (credential: ReviewCredentialRow) => {
    const signed = await supabase.storage.from(credential.file_bucket).createSignedUrl(credential.file_path, 60 * 10);
    if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error('Could not open credential file.');
    window.open(signed.data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const updateStatus = async (credentialId: string, status: 'approved' | 'rejected') => {
    setSavingId(credentialId);
    try {
      const userResult = await supabase.auth.getUser();
      const reviewerId = userResult.data.user?.id;
      const notes = notesById[credentialId] || null;

      const { error } = await supabase
        .from('chef_credentials')
        .update({
          status,
          review_notes: notes,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', credentialId);

      if (error) throw error;
      toast.success(`Credential ${status}`);
      await loadCredentials();
    } catch (error: any) {
      toast.error(error?.message || `Could not mark credential ${status}.`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">Credential Review</h1>
          <p className="text-sm text-muted-foreground mt-1">Review chef trust documents and approve or reject them.</p>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-border bg-card p-8 flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading credentials...
          </div>
        ) : accessDenied ? (
          <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-6 text-sm text-destructive">
            {accessDenied}
          </div>
        ) : (
          <div className="space-y-4">
            {credentials.map((credential) => (
              <div key={credential.id} className="rounded-3xl border border-border bg-card p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-semibold text-foreground">{credential.title}</h2>
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold capitalize text-muted-foreground">
                        {credential.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {credential.chef?.full_name || 'Chef'} {credential.chef?.username ? `(@${credential.chef.username})` : ''}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                      <p><span className="font-semibold text-foreground">Type:</span> {credential.credential_type.replaceAll('_', ' ')}</p>
                      <p><span className="font-semibold text-foreground">Issued by:</span> {credential.issued_by || '—'}</p>
                      <p><span className="font-semibold text-foreground">Issue date:</span> {credential.issue_date || '—'}</p>
                      <p><span className="font-semibold text-foreground">Expiration:</span> {credential.expiration_date || '—'}</p>
                    </div>
                  </div>

                  <button onClick={() => openCredentialPreview(credential).catch((error: any) => toast.error(error?.message || 'Could not open credential file.'))} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                    <Eye className="w-4 h-4" />
                    Preview file
                  </button>
                </div>

                <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FileWarning className="w-4 h-4 text-primary" />
                    Review notes / rejection reason
                  </div>
                  <textarea
                    value={notesById[credential.id] || ''}
                    onChange={(e) => setNotesById((prev) => ({ ...prev, [credential.id]: e.target.value }))}
                    rows={3}
                    placeholder="Add review notes or a rejection reason"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                  />
                </div>

                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-xs text-muted-foreground">
                  Approving a credential updates its status immediately. Trust score and badge unlocks are recalculated by the live trust system after approval.
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => updateStatus(credential.id, 'approved')}
                    disabled={savingId === credential.id}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                  >
                    {savingId === credential.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(credential.id, 'rejected')}
                    disabled={savingId === credential.id}
                    className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                  >
                    {savingId === credential.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Reject
                  </button>
                </div>
              </div>
            ))}

            {credentials.length === 0 && (
              <div className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground flex items-center gap-3">
                <ShieldX className="w-4 h-4" /> No credentials submitted yet.
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
