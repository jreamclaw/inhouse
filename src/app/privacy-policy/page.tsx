'use client';

import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { ArrowLeft, Shield, FileCheck2, Lock } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/signup" className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">How InHouse handles account, trust, and credential verification data.</p>
          </div>
        </div>

        <section className="rounded-3xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Credential uploads and verification data</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you upload chef credentials, certificates, licenses, permits, insurance records, or other verification materials, InHouse stores those files and related metadata to review eligibility for platform trust features and seller safety controls.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may store credential type, title, issuer, issue date, expiration date, review notes, review status, and supporting file metadata. Sensitive files are intended to be stored in restricted storage and reviewed only by authorized platform personnel or systems supporting the review process.
          </p>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileCheck2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Trust badges and trust score display</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            InHouse may display chef trust badges, verification indicators, trust labels, and trust scores based on profile completion, verification status, approved credentials, ratings, order history, and other platform safety signals.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            These trust features may be shown to customers on chef cards, chef profiles, marketplace surfaces, and other product areas to help users make informed decisions.
          </p>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Review, retention, and access</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            InHouse may review submitted documents manually or with operational tooling, retain review records for trust and safety purposes, and generate signed or restricted file access for internal review. We may also keep verification history, approval or rejection decisions, revocations, and expiry-related records where reasonably necessary for platform integrity, compliance, dispute handling, and fraud prevention.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Badge or trust display does not mean InHouse publicly exposes all underlying credential files. We aim to limit exposure of sensitive files and only disclose what is necessary for product functionality, trust display, legal compliance, or support operations.
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
