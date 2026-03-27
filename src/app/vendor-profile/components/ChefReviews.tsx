'use client';

import React, { useState } from 'react';
import { Star, ThumbsUp, ChevronDown } from 'lucide-react';

interface Review {
  id: string;
  customerName: string;
  customerAvatar: string;
  rating: number;
  date: string;
  text: string;
  photos?: string[];
  photoAlts?: string[];
  dishOrdered?: string;
  helpfulCount: number;
  isHelpful?: boolean;
}

interface ChefReviewsProps {
  chefName: string;
  aggregateRating: number;
  reviewCount: number;
  reviews: Review[];
}

const STAR_DISTRIBUTION: Record<number, number> = {
  5: 68,
  4: 20,
  3: 7,
  2: 3,
  1: 2
};

function StarRow({ filled, size = 'md' }: {filled: number;size?: 'sm' | 'md' | 'lg';}) {
  const sizeClass = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) =>
      <Star
        key={star}
        className={`${sizeClass} ${
        star <= filled ?
        'fill-amber-400 text-amber-400' :
        star - 0.5 <= filled ?
        'fill-amber-200 text-amber-300' : 'fill-muted text-muted-foreground/30'}`
        } />

      )}
    </div>);

}

export default function ChefReviews({ chefName, aggregateRating, reviewCount, reviews: initialReviews }: ChefReviewsProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [filter, setFilter] = useState<'all' | 5 | 4 | 3 | 2 | 1>('all');
  const [showAll, setShowAll] = useState(false);

  const filteredReviews = filter === 'all' ? reviews : reviews.filter((r) => r.rating === filter);
  const displayedReviews = showAll ? filteredReviews : filteredReviews.slice(0, 4);

  const toggleHelpful = (id: string) => {
    setReviews((prev) =>
    prev.map((r) =>
    r.id === id ?
    { ...r, isHelpful: !r.isHelpful, helpfulCount: r.isHelpful ? r.helpfulCount - 1 : r.helpfulCount + 1 } :
    r
    )
    );
  };

  return (
    <div className="pb-8">
      {/* Aggregate Score */}
      <div className="mx-4 mt-4 p-5 bg-card rounded-2xl border border-border/60 shadow-sm">
        <div className="flex items-center gap-5">
          {/* Big score */}
          <div className="flex flex-col items-center shrink-0">
            <span className="text-5xl font-800 text-foreground font-tabular leading-none tracking-tight">
              {aggregateRating.toFixed(1)}
            </span>
            <StarRow filled={Math.round(aggregateRating)} size="md" />
            <span className="text-[11px] text-muted-foreground mt-1 font-500">
              {reviewCount.toLocaleString()} reviews
            </span>
          </div>

          {/* Distribution bars */}
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const pct = STAR_DISTRIBUTION[star] ?? 0;
              return (
                <button
                  key={star}
                  onClick={() => setFilter(filter === star ? 'all' : star as 1 | 2 | 3 | 4 | 5)}
                  className={`w-full flex items-center gap-2 group transition-opacity ${
                  filter !== 'all' && filter !== star ? 'opacity-40' : ''}`
                  }>
                  
                  <span className="text-[11px] font-600 text-muted-foreground w-3 shrink-0 font-tabular">{star}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }} />
                    
                  </div>
                  <span className="text-[10px] text-muted-foreground w-6 text-right font-tabular shrink-0">{pct}%</span>
                </button>);

            })}
          </div>
        </div>

        {/* Sentiment tags */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/40">
          {['Authentic flavors', 'Great portions', 'Fast delivery', 'Worth the price', 'Beautiful plating'].map((tag) =>
          <span
            key={tag}
            className="text-[11px] font-500 px-2.5 py-1 bg-primary/8 text-primary rounded-full border border-primary/15">
            
              {tag}
            </span>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3">
        {(['all', 5, 4, 3, 2, 1] as const).map((f) =>
        <button
          key={f}
          onClick={() => {setFilter(f);setShowAll(false);}}
          className={`shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[12px] font-600 transition-all duration-150 ${
          filter === f ?
          'bg-primary text-white shadow-sm shadow-primary/20' :
          'bg-muted text-muted-foreground hover:text-foreground'}`
          }>
          
            {f === 'all' ?
          'All Reviews' :

          <>
                <Star className="w-3 h-3 fill-current" />
                {f}
              </>
          }
          </button>
        )}
      </div>

      {/* Review count for filter */}
      {filter !== 'all' &&
      <p className="px-4 pb-2 text-[12px] text-muted-foreground">
          Showing {filteredReviews.length} {filter}-star review{filteredReviews.length !== 1 ? 's' : ''}
        </p>
      }

      {/* Review cards */}
      <div className="px-4 space-y-3">
        {displayedReviews.length === 0 ?
        <div className="py-10 text-center">
            <p className="text-[14px] text-muted-foreground">No reviews for this rating yet.</p>
          </div> :

        displayedReviews.map((review) =>
        <div key={review.id} className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm">
              {/* Header */}
              <div className="flex items-start gap-3">
                <img
              src={review.customerAvatar}
              alt={`${review.customerName} profile photo`}
              className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-border/40" />
            
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-700 text-foreground leading-tight">{review.customerName}</p>
                      {review.dishOrdered &&
                  <p className="text-[11px] text-muted-foreground mt-0.5">Ordered: {review.dishOrdered}</p>
                  }
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{review.date}</span>
                  </div>
                  <div className="mt-1">
                    <StarRow filled={review.rating} size="sm" />
                  </div>
                </div>
              </div>

              {/* Review text */}
              <p className="text-[13px] text-foreground/85 mt-3 leading-relaxed">{review.text}</p>

              {/* Customer photos */}
              {review.photos && review.photos.length > 0 &&
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
                  {review.photos.map((photo, idx) =>
            <div key={idx} className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-border/40">
                      <img
                src={photo}
                alt={review.photoAlts?.[idx] ?? `Customer photo ${idx + 1} from ${review.customerName}`}
                className="w-full h-full object-cover"
                loading="lazy" />
              
                    </div>
            )}
                </div>
          }

              {/* Helpful */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                <button
              onClick={() => toggleHelpful(review.id)}
              className={`flex items-center gap-1.5 text-[11px] font-600 px-2.5 py-1 rounded-full transition-all active:scale-95 ${
              review.isHelpful ?
              'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground hover:text-foreground'}`
              }>
              
                  <ThumbsUp className="w-3 h-3" />
                  Helpful {review.helpfulCount > 0 && <span className="font-tabular">({review.helpfulCount})</span>}
                </button>
              </div>
            </div>
        )
        }
      </div>

      {/* Show more */}
      {filteredReviews.length > 4 && !showAll &&
      <div className="px-4 mt-3">
          <button
          onClick={() => setShowAll(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-[13px] font-600 text-primary bg-primary/6 rounded-2xl border border-primary/15 hover:bg-primary/10 active:scale-[0.98] transition-all">
          
            Show all {filteredReviews.length} reviews
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      }
    </div>);

}

// Mock reviews data factory — used by vendor-profile page
export const MOCK_REVIEWS: Review[] = [
{
  id: 'rev-001',
  customerName: 'Jordan Williams',
  customerAvatar: "https://img.rocket.new/generatedImages/rocket_gen_img_14247f6dc-1772057422002.png",
  rating: 5,
  date: '2 days ago',
  text: "Absolutely incredible. The Truffle Tagliatelle was the best pasta I've had outside of Italy. The portion was generous and the truffle aroma was intoxicating. Will be ordering every week.",
  dishOrdered: 'Truffle Tagliatelle',
  photos: [
  'https://images.unsplash.com/photo-1685022135825-b74ac61b5e14?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=200&h=200&fit=crop'],

  photoAlts: [
  'Truffle tagliatelle pasta dish with cream sauce',
  'Close-up of pasta with truffle shavings'],

  helpfulCount: 14
},
{
  id: 'rev-002',
  customerName: 'Priya Nair',
  customerAvatar: "https://img.rocket.new/generatedImages/rocket_gen_img_10c048421-1764895467197.png",
  rating: 5,
  date: '5 days ago',
  text: "The Osso Buco was a masterpiece. Tender, fall-off-the-bone veal with the most fragrant saffron risotto. Packaging was beautiful and everything arrived hot. Chef Marco is the real deal.",
  dishOrdered: 'Osso Buco alla Milanese',
  photos: [
  'https://images.unsplash.com/photo-1574484284002-952d92456975?w=200&h=200&fit=crop'],

  photoAlts: ['Osso buco braised veal with risotto on a white plate'],
  helpfulCount: 9
},
{
  id: 'rev-003',
  customerName: 'Marcus Thompson',
  customerAvatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1038f0be2-1766590129170.png",
  rating: 4,
  date: '1 week ago',
  text: "Really solid Cacio e Pepe — creamy, peppery, and cooked perfectly al dente. Delivery was a bit slow but the food was worth the wait. The tiramisu was a great add-on too.",
  dishOrdered: 'Cacio e Pepe',
  helpfulCount: 5
},
{
  id: 'rev-004',
  customerName: 'Sofia Reyes',
  customerAvatar: "https://img.rocket.new/generatedImages/rocket_gen_img_109e9ea2a-1772468752458.png",
  rating: 5,
  date: '1 week ago',
  text: "The burrata was so fresh it tasted like it was made that morning. Paired with the heirloom tomatoes and basil oil — simple perfection. I've already recommended this chef to five friends.",
  dishOrdered: 'Burrata & Heirloom Tomato',
  photos: [
  'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=200&h=200&fit=crop'],

  photoAlts: ['Fresh burrata with heirloom tomatoes and basil oil'],
  helpfulCount: 11
},
{
  id: 'rev-005',
  customerName: 'Devon Carter',
  customerAvatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1a02f3e11-1772324930194.png",
  rating: 5,
  date: '2 weeks ago',
  text: "Ordered for a dinner party and everyone was blown away. The presentation was restaurant-quality and the flavors were even better. Marco clearly puts his heart into every dish.",
  dishOrdered: 'Truffle Tagliatelle',
  helpfulCount: 7
},
{
  id: 'rev-006',
  customerName: 'Aaliyah Brooks',
  customerAvatar: "https://img.rocket.new/generatedImages/rocket_gen_img_145925fa9-1769448175849.png",
  rating: 3,
  date: '3 weeks ago',
  text: "Food was good but arrived a little cold. The tiramisu was the highlight — creamy and not too sweet. Would order again but hope the delivery time improves.",
  dishOrdered: 'Tiramisu Classico',
  helpfulCount: 2
},
{
  id: 'rev-007',
  customerName: 'Ethan Park',
  customerAvatar: "https://images.unsplash.com/photo-1632578846160-b7d1770cf1ad",
  rating: 4,
  date: '3 weeks ago',
  text: "Genuinely one of the best home-cooked Italian meals I've had in DC. The pasta was handmade and you could taste the difference. Slightly pricey but absolutely worth it for a special occasion.",
  dishOrdered: 'Osso Buco alla Milanese',
  helpfulCount: 6
}];