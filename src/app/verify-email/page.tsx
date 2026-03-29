'use client';

import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { Mail, ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 text-center shadow-sm">
        <div className="flex items-center justify-center mb-6">
          <AppLogo size={72} />
        </div>
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          We sent you a confirmation link. Open your email, confirm your account, and then come back to log in.
        </p>
        <div className="rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground mb-6">
          If you do not see the email, check spam or promotions first.
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-600 text-white hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </div>
    </div>
  );
}
