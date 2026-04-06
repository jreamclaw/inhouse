'use client';

import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { ArrowLeft, Mail, ShieldAlert, HelpCircle, Trash2, FileText } from 'lucide-react';

export default function SupportPage() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/settings" className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-700 text-foreground">Support</h1>
            <p className="text-sm text-muted-foreground">Get help with your account, orders, and app issues</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-700 text-foreground">Email support</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">For account help, bugs, refunds, order issues, or chef onboarding questions, email us directly.</p>
                <a href="mailto:support@inhousapp.net" className="inline-flex mt-3 text-sm font-700 text-primary hover:text-primary/80 transition-colors">support@inhousapp.net</a>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-700 text-foreground">What to include</h2>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  <li>• your account email</li>
                  <li>• what happened</li>
                  <li>• screenshots if possible</li>
                  <li>• order ID if the problem is order-related</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-sm font-700 text-foreground">Urgent issues</h2>
                <p className="text-sm text-muted-foreground mt-1">For payment problems, safety concerns, or account access issues, include <span className="font-700 text-foreground">URGENT</span> in the subject line.</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-700 text-foreground">Account deletion</h2>
                <p className="text-sm text-muted-foreground mt-1">Right now account deletion is handled through support so we can verify ownership and avoid accidental removal.</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-700 text-foreground">Legal</h2>
                <div className="mt-2 flex flex-col gap-2 text-sm">
                  <Link href="/terms-of-service" className="text-primary font-700 hover:text-primary/80 transition-colors">Terms of Service</Link>
                  <Link href="/privacy-policy" className="text-primary font-700 hover:text-primary/80 transition-colors">Privacy Policy</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
