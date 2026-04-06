'use client';

import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { ArrowLeft, BadgeCheck, FileWarning, ShieldAlert } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/signup" className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Rules for chef verification, trust badges, and credential use on InHouse.</p>
          </div>
        </div>

        <section className="rounded-3xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileWarning className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Chef credential responsibility</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Chefs are responsible for submitting truthful, current, complete, and lawfully obtained documents. You agree not to upload forged, misleading, altered, expired, unauthorized, or otherwise inaccurate credentials.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You are responsible for maintaining current certificates, permits, licenses, insurance information, and other uploaded records. If a document expires, becomes invalid, or no longer accurately reflects your legal or professional status, you must update or remove it promptly.
          </p>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <BadgeCheck className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Verification review, badges, and trust score</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            InHouse may review uploaded credentials and assign, deny, suspend, revoke, remove, or modify verification indicators, trust badges, trust labels, and trust scores at our discretion based on platform rules, document review outcomes, expiration status, customer safety concerns, quality signals, fraud prevention needs, or other marketplace integrity considerations.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            InHouse may approve, reject, revoke, or remove badges or verification features at any time, including after prior approval, if documents are missing, expired, inconsistent, misleading, or no longer satisfy platform standards.
          </p>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">No legal endorsement beyond platform review</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Trust badges, verification indicators, and trust scores reflect InHouse platform review and internal marketplace signals only. They do not guarantee legal compliance, licensure validity in every jurisdiction, food safety outcomes, insurance sufficiency, business endorsement, or regulatory approval beyond the scope of our platform review process.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Customers should still use independent judgment when ordering, booking, or interacting with chefs. Platform trust features are informative signals, not a warranty, certification authority decision, or legal opinion.
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
