'use client';

import React from 'react';

// ─── Shared shimmer base ───────────────────────────────────────────────────
function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-muted rounded ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

// ─── Post Card Skeleton ────────────────────────────────────────────────────
export function PostCardSkeleton() {
  return (
    <article className="bg-card border-b border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <Shimmer className="w-10 h-10 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Shimmer className="h-3.5 w-28 rounded-md" />
            <Shimmer className="h-3 w-20 rounded-md" />
          </div>
        </div>
        <Shimmer className="w-6 h-6 rounded-full" />
      </div>

      {/* Image */}
      <Shimmer className="w-full aspect-square rounded-none" />

      {/* Action bar */}
      <div className="flex items-center gap-4 px-4 py-3">
        <Shimmer className="w-6 h-6 rounded-full" />
        <Shimmer className="w-6 h-6 rounded-full" />
        <Shimmer className="w-6 h-6 rounded-full" />
        <Shimmer className="w-6 h-6 rounded-full ml-auto" />
      </div>

      {/* Likes + caption */}
      <div className="px-4 pb-4 space-y-2">
        <Shimmer className="h-3.5 w-24 rounded-md" />
        <Shimmer className="h-3 w-full rounded-md" />
        <Shimmer className="h-3 w-4/5 rounded-md" />
        <Shimmer className="h-3 w-1/2 rounded-md" />
      </div>

      {/* Meal tag */}
      <div className="px-4 pb-4">
        <Shimmer className="h-10 w-full rounded-xl" />
      </div>
    </article>
  );
}

export function PostFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Profile Header Skeleton ───────────────────────────────────────────────
export function ProfileHeaderSkeleton() {
  return (
    <div className="bg-card">
      {/* Cover */}
      <Shimmer className="w-full h-32 sm:h-44 rounded-none" />

      <div className="px-4 pb-4">
        {/* Avatar + buttons row */}
        <div className="flex items-end justify-between -mt-12 mb-4">
          <Shimmer className="w-24 h-24 rounded-full border-4 border-card" />
          <div className="flex items-center gap-2 pb-1">
            <Shimmer className="h-9 w-28 rounded-full" />
            <Shimmer className="w-9 h-9 rounded-full" />
          </div>
        </div>

        {/* Name */}
        <div className="mb-2 space-y-1.5">
          <Shimmer className="h-5 w-40 rounded-md" />
          <Shimmer className="h-3.5 w-24 rounded-md" />
        </div>

        {/* Bio */}
        <div className="mb-3 space-y-1.5">
          <Shimmer className="h-3 w-full rounded-md" />
          <Shimmer className="h-3 w-3/4 rounded-md" />
        </div>

        {/* Meta */}
        <div className="flex gap-4 mb-3">
          <Shimmer className="h-3.5 w-28 rounded-md" />
          <Shimmer className="h-3.5 w-28 rounded-md" />
        </div>

        {/* Stats row */}
        <div className="flex items-center border border-border rounded-2xl overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`flex-1 py-3 flex flex-col items-center gap-1 ${i < 2 ? 'border-r border-border' : ''}`}
            >
              <Shimmer className="h-5 w-10 rounded-md" />
              <Shimmer className="h-3 w-14 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Profile Tabs Skeleton ─────────────────────────────────────────────────
export function ProfileTabsSkeleton() {
  return (
    <div className="bg-card mt-2">
      {/* Tab bar */}
      <div className="flex border-b border-border px-4 gap-6 pt-2">
        {[0, 1, 2].map((i) => (
          <Shimmer key={i} className={`h-8 rounded-md ${i === 0 ? 'w-16' : 'w-20'}`} />
        ))}
      </div>

      {/* Grid of post thumbnails */}
      <div className="grid grid-cols-3 gap-0.5 p-0.5 mt-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <Shimmer key={i} className="aspect-square rounded-none" />
        ))}
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <>
      <ProfileHeaderSkeleton />
      <ProfileTabsSkeleton />
    </>
  );
}

// ─── Checkout Step Skeleton ────────────────────────────────────────────────
export function CheckoutCartSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Step progress */}
      <div className="flex items-center gap-1 mb-4">
        {[0, 1, 2].map((i) => (
          <React.Fragment key={i}>
            <Shimmer className="w-7 h-7 rounded-full" />
            {i < 2 && <Shimmer className="flex-1 h-1 rounded-full" />}
          </React.Fragment>
        ))}
      </div>

      {/* Cart items */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 bg-card border border-border rounded-2xl p-3">
          <Shimmer className="w-20 h-20 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <Shimmer className="h-4 w-3/4 rounded-md" />
            <Shimmer className="h-3 w-full rounded-md" />
            <div className="flex items-center justify-between mt-2">
              <Shimmer className="h-4 w-16 rounded-md" />
              <Shimmer className="h-8 w-24 rounded-full" />
            </div>
          </div>
        </div>
      ))}

      {/* Promo */}
      <Shimmer className="h-12 w-full rounded-xl" />

      {/* Order summary */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <Shimmer className="h-4 w-32 rounded-md" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between">
            <Shimmer className="h-3.5 w-24 rounded-md" />
            <Shimmer className="h-3.5 w-16 rounded-md" />
          </div>
        ))}
        <div className="border-t border-border pt-3 flex justify-between">
          <Shimmer className="h-5 w-16 rounded-md" />
          <Shimmer className="h-5 w-20 rounded-md" />
        </div>
      </div>

      {/* CTA */}
      <Shimmer className="h-14 w-full rounded-2xl" />
    </div>
  );
}

export function CheckoutDeliverySkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Shimmer className="h-5 w-40 rounded-md mb-2" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-1.5">
          <Shimmer className="h-3.5 w-24 rounded-md" />
          <Shimmer className="h-12 w-full rounded-xl" />
        </div>
      ))}
      <Shimmer className="h-14 w-full rounded-2xl mt-4" />
    </div>
  );
}

export function CheckoutPaymentSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Shimmer className="h-5 w-36 rounded-md mb-2" />
      {/* Payment method options */}
      {[0, 1, 2].map((i) => (
        <Shimmer key={i} className="h-14 w-full rounded-xl" />
      ))}
      {/* Card fields */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-1.5">
          <Shimmer className="h-3.5 w-24 rounded-md" />
          <Shimmer className="h-12 w-full rounded-xl" />
        </div>
      ))}
      <Shimmer className="h-14 w-full rounded-2xl mt-4" />
    </div>
  );
}
