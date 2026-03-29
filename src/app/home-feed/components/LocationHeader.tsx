'use client';

import React, { useState } from 'react';
import { MapPin, ChevronDown, Navigation } from 'lucide-react';

const CITIES = [
  'Washington, DC',
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Houston, TX',
  'Atlanta, GA',
  'Miami, FL',
  'Seattle, WA',
  'Austin, TX',
  'Boston, MA',
];

interface LocationHeaderProps {
  mode: 'local' | 'explore';
  onModeChange: (mode: 'local' | 'explore') => void;
  location: string;
  onLocationChange: (loc: string) => void;
}

export default function LocationHeader({ mode, onModeChange, location, onLocationChange }: LocationHeaderProps) {
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const handleSelectCity = (city: string) => {
    onLocationChange(city);
    setShowLocationPicker(false);
    setCustomInput('');
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onLocationChange(customInput.trim());
      setShowLocationPicker(false);
      setCustomInput('');
    }
  };

  return (
    <div className="bg-card border-b border-border/50 px-4 py-3 sticky top-14 z-40">
      {/* Location row */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setShowLocationPicker(!showLocationPicker)}
          className="flex items-center gap-1.5 group"
          aria-label="Change location"
          suppressHydrationWarning
        >
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-sm font-600 text-foreground group-hover:text-primary transition-colors tracking-snug">
            Near {location}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${showLocationPicker ? 'rotate-180' : ''}`} />
        </button>

        {mode === 'local' && location !== 'Set your location' && (
          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-500">
            <Navigation className="w-3 h-3" />
            <span>Saved location</span>
          </div>
        )}
      </div>

      {/* Local / Explore toggle */}
      <div className="flex bg-muted rounded-xl p-[3px] gap-[2px]">
        <button
          onClick={() => onModeChange('local')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[9px] text-sm font-600 transition-all duration-200 ${
            mode === 'local' ?'bg-card text-foreground shadow-subtle' :'text-muted-foreground hover:text-foreground'
          }`}
          suppressHydrationWarning
        >
          <span>📍</span>
          <span>Local</span>
        </button>
        <button
          onClick={() => onModeChange('explore')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[9px] text-sm font-600 transition-all duration-200 ${
            mode === 'explore' ?'bg-card text-foreground shadow-subtle' :'text-muted-foreground hover:text-foreground'
          }`}
          suppressHydrationWarning
        >
          <span>🌎</span>
          <span>Explore</span>
        </button>
      </div>

      {/* Location picker dropdown */}
      {showLocationPicker && (
        <div className="absolute left-4 right-4 top-full mt-2 bg-card border border-border/60 rounded-2xl shadow-elevated z-50 overflow-hidden fade-in">
          <div className="p-3 border-b border-border/50">
            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter city or zip code..."
                className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
              <button
                type="submit"
                className="bg-primary text-white text-sm font-600 px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
                suppressHydrationWarning
              >
                Go
              </button>
            </form>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {CITIES.map((city) => (
              <button
                key={city}
                onClick={() => handleSelectCity(city)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left ${
                  location === city ? 'text-primary font-600' : 'text-foreground'
                }`}
                suppressHydrationWarning
              >
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {city}
                {location === city && <span className="ml-auto text-xs text-primary font-500">Current</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
