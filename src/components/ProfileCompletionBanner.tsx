'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, User, MapPin, FileText, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MissingField { key: string; label: string; icon: React.ReactNode; }
const DISMISS_KEY = 'inhouse-profile-reminder-dismissed';

export default function ProfileCompletionBanner() {
  const { profile } = useAuth();
  const [dismissed, setDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const wasDismissed = sessionStorage.getItem(DISMISS_KEY) === 'true';
    setDismissed(wasDismissed);
  }, []);

  if (!mounted || !profile || !profile.onboarding_complete || dismissed) return null;

  const missingFields: MissingField[] = [];
  if (!profile.avatar_url) missingFields.push({ key: 'avatar', label: 'Profile photo', icon: <User className="w-3.5 h-3.5" /> });
  if (!profile.bio) missingFields.push({ key: 'bio', label: 'Bio', icon: <FileText className="w-3.5 h-3.5" /> });
  if (!profile.location) missingFields.push({ key: 'location', label: 'Location', icon: <MapPin className="w-3.5 h-3.5" /> });
  if (!profile.cover_url) missingFields.push({ key: 'cover', label: 'Cover photo', icon: <ImageIcon className="w-3.5 h-3.5" /> });
  if (missingFields.length === 0) return null;

  const completionPercent = Math.round(((4 - missingFields.length) / 4) * 100);
  const handleDismiss = () => { sessionStorage.setItem(DISMISS_KEY, 'true'); setDismissed(true); };

  return (
    <div className="mx-4 mt-3 mb-1 rounded-2xl border border-[#E5E5E5] bg-[#FFF7ED] px-3.5 py-2.5 flex items-start gap-2.5">
      <div className="shrink-0 mt-0.5">
        <div className="relative w-9 h-9">
          <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#E5E5E5]" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${completionPercent * 0.942} 94.2`} strokeLinecap="round" className="text-[#F97316] transition-all duration-500" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-700 text-[#F97316]">{completionPercent}%</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[#111111] leading-tight">Complete your profile</p>
            <p className="text-[11px] text-[#555555] mt-0.5 line-clamp-2">Add the missing details to help others discover you.</p>
          </div>
          <button onClick={handleDismiss} className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center hover:bg-white transition-colors" aria-label="Dismiss reminder">
            <X className="w-3.5 h-3.5 text-[#777777]" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1 mt-2 mb-2">
          {missingFields.slice(0, 2).map((field) => (
            <span key={field.key} className="inline-flex items-center gap-1 text-[10px] font-medium bg-white border border-[#E5E5E5] text-[#555555] px-2 py-0.5 rounded-full">
              {field.icon}
              {field.label}
            </span>
          ))}
          {missingFields.length > 2 && (
            <span className="inline-flex items-center text-[10px] font-medium bg-white border border-[#E5E5E5] text-[#555555] px-2 py-0.5 rounded-full">
              +{missingFields.length - 2} more
            </span>
          )}
        </div>
        <Link href="/edit-profile">
          <button className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F97316] hover:text-[#C2410C] transition-colors">
            Update profile
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}
