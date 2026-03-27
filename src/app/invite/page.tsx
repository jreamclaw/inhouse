'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Link2, Mail, MessageCircle, Copy, CheckCircle, Users, Gift, Twitter, Facebook,  } from 'lucide-react';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';


export default function InvitePage() {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);

  const referralCode = profile?.username
    ? `INHOUSE-${profile.username.toUpperCase().slice(0, 8)}`
    : 'INHOUSE-FRIEND';

  const inviteLink = `https://inhouseapp.net/join?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setSending(true);
    // Simulate sending
    await new Promise((r) => setTimeout(r, 1000));
    toast.success(`Invite sent to ${emailInput}!`);
    setEmailInput('');
    setSending(false);
  };

  const shareOptions = [
    {
      label: 'Copy Link',
      icon: copied ? CheckCircle : Copy,
      color: 'bg-muted text-foreground hover:bg-border',
      onClick: handleCopy,
    },
    {
      label: 'Share via SMS',
      icon: MessageCircle,
      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50',
      onClick: () => {
        const msg = encodeURIComponent(`Hey! Join me on InHouse — discover amazing home-cooked meals near you. Use my link: ${inviteLink}`);
        window.open(`sms:?body=${msg}`, '_blank');
      },
    },
    {
      label: 'Twitter / X',
      icon: Twitter,
      color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 hover:bg-sky-200 dark:hover:bg-sky-900/50',
      onClick: () => {
        const text = encodeURIComponent(`I'm on InHouse — the best way to discover home-cooked meals near you! Join with my link:`);
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(inviteLink)}`, '_blank');
      },
    },
    {
      label: 'Facebook',icon: Facebook,color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50',
      onClick: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`, '_blank');
      },
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Invite Friends</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Share InHouse with friends and help them discover amazing home-cooked meals near them.
          </p>
        </div>

        {/* Referral Code Card */}
        <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-3xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-foreground">Your Invite Link</span>
          </div>
          <div className="flex items-center gap-2 bg-background rounded-2xl border border-border px-4 py-3">
            <span className="flex-1 text-sm text-muted-foreground truncate font-mono">{inviteLink}</span>
            <button
              onClick={handleCopy}
              className="shrink-0 w-8 h-8 rounded-xl bg-primary flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95"
              aria-label="Copy invite link"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-white" />
              ) : (
                <Copy className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Your code:</span>
            <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">{referralCode}</span>
          </div>
        </div>

        {/* Share Options */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Share via</h2>
          <div className="grid grid-cols-2 gap-3">
            {shareOptions.map(({ label, icon: Icon, color, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-sm transition-all active:scale-95 ${color}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Email Invite */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Invite by Email</h2>
          <form onSubmit={handleEmailInvite} className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="friend@example.com"
              className="flex-1 bg-muted rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 border border-transparent focus:border-primary/30 transition-all"
            />
            <button
              type="submit"
              disabled={!emailInput.trim() || sending}
              className="px-5 py-3 bg-primary text-white text-sm font-semibold rounded-2xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              Send
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className="bg-card border border-border/50 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Your Invites</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Sent', value: '0' },
              { label: 'Joined', value: '0' },
              { label: 'Active', value: '0' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
