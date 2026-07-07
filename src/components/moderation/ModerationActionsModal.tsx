'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Ban, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ModerationActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetDisplayName: string;
  targetUsername?: string | null;
}

const REPORT_REASONS = [
  'Harassment or bullying',
  'Hate or abusive content',
  'Spam or scam behavior',
  'Sexual or explicit content',
  'Violence or dangerous activity',
  'Fake account or impersonation',
  'Other',
] as const;

export default function ModerationActionsModal({
  isOpen,
  onClose,
  targetUserId,
  targetDisplayName,
  targetUsername,
}: ModerationActionsModalProps) {
  const supabase = createClient();
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<(typeof REPORT_REASONS)[number]>('Harassment or bullying');
  const [details, setDetails] = useState('');
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const targetLabel = useMemo(() => targetUsername ? `@${targetUsername}` : targetDisplayName, [targetDisplayName, targetUsername]);

  if (!isOpen) return null;

  const requireSignedInUser = () => {
    if (user?.id) return true;
    toast.error('Please sign in to report or block users.');
    return false;
  };

  const handleReport = async () => {
    if (!requireSignedInUser()) return;
    if (reporting) return;

    setReporting(true);
    try {
      const { error } = await supabase.from('content_reports').insert({
        reporter_id: user.id,
        target_user_id: targetUserId,
        target_type: 'user',
        target_id: targetUserId,
        reason: selectedReason,
        details: details.trim() || null,
      });

      if (error) throw error;

      toast.success(`Report submitted for ${targetLabel}.`);
      setDetails('');
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Could not submit report.');
    } finally {
      setReporting(false);
    }
  };

  const handleBlock = async () => {
    if (!requireSignedInUser()) return;
    if (blocking) return;

    setBlocking(true);
    try {
      const { error } = await supabase.from('user_blocks').upsert({
        blocker_id: user.id,
        blocked_id: targetUserId,
        reason: selectedReason,
      }, { onConflict: 'blocker_id,blocked_id' });

      if (error) throw error;

      toast.success(`${targetLabel} has been blocked.`);
      setDetails('');
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Could not block user.');
    } finally {
      setBlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-[28px] border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-700 text-foreground">Safety actions</h3>
            <p className="text-sm text-muted-foreground mt-1">Report or block {targetDisplayName} if something feels off.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
          <div>
            <p className="text-sm font-600 text-foreground mb-2">Reason</p>
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
          </div>

          <div>
            <label className="block text-sm font-600 text-foreground mb-2">Extra details (optional)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add any details that would help moderation review this faster."
              rows={3}
              maxLength={300}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/25 resize-none"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <button
            onClick={handleReport}
            disabled={reporting || blocking}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-white font-700 py-3 hover:bg-primary/90 disabled:opacity-60"
          >
            {reporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            Submit report
          </button>
          <button
            onClick={handleBlock}
            disabled={blocking || reporting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 text-red-600 font-700 py-3 hover:bg-red-100 disabled:opacity-60 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
          >
            {blocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
            Block user
          </button>
          <button onClick={onClose} className="w-full rounded-2xl border border-border py-3 text-sm font-600 text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
