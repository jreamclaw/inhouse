'use client';

import React, { useState } from 'react';
import { X, Star, ChefHat, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DishItem {
  id: string;
  title: string;
  image: string;
  imageAlt: string;
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName: string;
  vendorAvatar: string;
  dishes: DishItem[];
}

function StarRating({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hovered, setHovered] = useState(0);
  const sizeClass = size === 'lg' ? 'w-9 h-9' : size === 'sm' ? 'w-5 h-5' : 'w-7 h-7';

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            className={`${sizeClass} transition-transform hover:scale-110 active:scale-95`}
          >
            <Star
              className={`w-full h-full transition-colors ${
                filled
                  ? 'fill-amber-400 text-amber-400' :'fill-transparent text-muted-foreground/40'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Excellent!',
};

export default function ReviewModal({
  isOpen,
  onClose,
  vendorName,
  vendorAvatar,
  dishes,
}: ReviewModalProps) {
  const [vendorRating, setVendorRating] = useState(0);
  const [dishRatings, setDishRatings] = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDishRating = (dishId: string, rating: number) => {
    setDishRatings((prev) => ({ ...prev, [dishId]: rating }));
  };

  const handleSubmit = async () => {
    if (vendorRating === 0) {
      toast.error('Please rate your overall experience');
      return;
    }
    setIsSubmitting(true);
    // Backend integration: POST /api/reviews { vendorRating, dishRatings, reviewText }
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  const handleClose = () => {
    setSubmitted(false);
    setVendorRating(0);
    setDishRatings({});
    setReviewText('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Rate your order"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {submitted ? (
          /* ── SUCCESS STATE ── */
          <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-700 text-foreground mb-2">Thanks for your review!</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Your feedback helps {vendorName} and other food lovers in the community.
            </p>
            <div className="flex justify-center gap-1 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-7 h-7 ${
                    star <= vendorRating
                      ? 'fill-amber-400 text-amber-400' :'fill-transparent text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleClose}
              className="w-full bg-primary text-white font-700 py-3.5 rounded-2xl hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border shrink-0">
              <div>
                <h2 className="text-lg font-700 text-foreground">Rate Your Order</h2>
                <p className="text-xs text-muted-foreground mt-0.5">How was your experience?</p>
              </div>
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-95"
                aria-label="Close review modal"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
              {/* Vendor overall rating */}
              <div className="bg-accent rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={vendorAvatar}
                    alt={`${vendorName} avatar`}
                    className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                  />
                  <div>
                    <p className="text-sm font-700 text-foreground">{vendorName}</p>
                    <div className="flex items-center gap-1">
                      <ChefHat className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">Personal Chef</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm font-600 text-foreground mb-2">Overall Experience</p>
                <div className="flex items-center gap-3">
                  <StarRating value={vendorRating} onChange={setVendorRating} size="lg" />
                  {vendorRating > 0 && (
                    <span className="text-sm font-600 text-primary fade-in">
                      {RATING_LABELS[vendorRating]}
                    </span>
                  )}
                </div>
              </div>

              {/* Individual dish ratings */}
              {dishes.length > 0 && (
                <div>
                  <p className="text-sm font-700 text-foreground mb-3">Rate Individual Dishes</p>
                  <div className="space-y-3">
                    {dishes.map((dish) => (
                      <div
                        key={dish.id}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-2xl border border-border"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-muted">
                          <img
                            src={dish.image}
                            alt={dish.imageAlt}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-600 text-foreground truncate mb-1">
                            {dish.title}
                          </p>
                          <StarRating
                            value={dishRatings[dish.id] ?? 0}
                            onChange={(v) => handleDishRating(dish.id, v)}
                            size="sm"
                          />
                        </div>
                        {(dishRatings[dish.id] ?? 0) > 0 && (
                          <span className="text-xs font-500 text-primary shrink-0 fade-in">
                            {RATING_LABELS[dishRatings[dish.id]]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Written review */}
              <div>
                <label
                  htmlFor="review-text"
                  className="block text-sm font-700 text-foreground mb-2"
                >
                  Write a Review{' '}
                  <span className="text-muted-foreground font-400">(optional)</span>
                </label>
                <textarea
                  id="review-text"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience — the food, presentation, delivery speed..."
                  rows={3}
                  maxLength={500}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none border border-transparent focus:border-primary/30"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">
                  {reviewText.length}/500
                </p>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="px-5 py-4 border-t border-border shrink-0">
              <button
                onClick={handleSubmit}
                disabled={vendorRating === 0 || isSubmitting}
                className="w-full bg-primary text-white font-700 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4 fill-white text-white" />
                    Submit Review
                  </>
                )}
              </button>
              <button
                onClick={handleClose}
                className="w-full text-sm font-500 text-muted-foreground py-2 mt-2 hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
