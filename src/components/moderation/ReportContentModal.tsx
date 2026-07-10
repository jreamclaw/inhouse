'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ReportContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'post' | 'story' | 'comment';
  targetId: string;
  targetUserId?: string | null;
  targetLabel: string;
}

const REPORT_REASONS = [
  'Harassment or bullying',
  'Hate or abusive content',
  'Spam or scam behavior',
  'Sexual or explicit content',
  'Violence or dangerous activity',
  'False or misleading content',
  'Other',
] as const;

export default function ReportContentModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetUserId,
  targetLabel,
}: ReportContentModalProps) {
  const supabase = createClient();
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<(typeof REPORT_REASONS)[number]>('Harassment or bullying');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const noun = useMemo(() => {
    if (targetType === 'story') return 'story';
    if (targetType === 'comment') return 'comment';
    return 'post';
  }, [targetType]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('Please sign in to submit a report.');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('content_reports').insert({
        reporter_id: user.id,
        target_user_id: targetUserId || null,
        target_type: targetType,
        target_id: targetId,
        reason: selectedReason,
        details: details.trim() || null,
      });

      if (error) throw error;

      await fetch('/api/admin/moderation-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          reason: selectedReason,
        }),
      }).catch(() => null);

      toast.success(`${targetLabel} reported.`);
      setDetails('');
      onClose();
    } catch (error: any) {
      toast.error(error?.message || `Could not report this ${noun}.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/55 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-[28px] border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-700 text-foreground">Report {noun}</h3>
            <p className="text-sm text-muted-foreground mt-1">Tell us what is wrong with this {noun} so it can be reviewed.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${selectedReason === reason ? 'bg-primary text-white' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}
              >
                {reason}
              </button>
            ))}
          </div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Add any details that would help moderation review this faster."
            rows={3}
            maxLength={300}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/25 resize-none"
          />
        </div>

        <div className="mt-4 space-y-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-white font-700 py-3 hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            Submit report
          </button>
          <button onClick={onClose} className="w-full rounded-2xl border border-border py-3 text-sm font-600 text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
