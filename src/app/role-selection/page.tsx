'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';
import { Loader2, ChefHat, ShoppingBag, ArrowRight } from 'lucide-react';

type Role = 'chef' | 'customer';

interface RoleOption {
  id: Role;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  perks: string[];
  gradient: string;
  borderColor: string;
  selectedBg: string;
}

const roleOptions: RoleOption[] = [
  {
    id: 'chef',
    icon: <ChefHat className="w-8 h-8" />,
    title: 'Chef / Vendor',
    subtitle: 'I cook & sell meals',
    description: 'Share your culinary creations, build a following, and earn by selling your homemade dishes.',
    perks: ['Create & share meal posts', 'Set your own menu & prices', 'Receive orders from customers', 'Build your chef brand'],
    gradient: 'from-orange-500 to-amber-500',
    borderColor: 'border-orange-400',
    selectedBg: 'bg-orange-50',
  },
  {
    id: 'customer',
    icon: <ShoppingBag className="w-8 h-8" />,
    title: 'Customer',
    subtitle: 'I discover & order food',
    description: 'Explore local chefs, discover unique homemade dishes, and order meals delivered to your door.',
    perks: ['Browse local chef menus', 'Order homemade meals', 'Follow your favorite chefs', 'Discover new cuisines'],
    gradient: 'from-violet-500 to-purple-500',
    borderColor: 'border-violet-400',
    selectedBg: 'bg-violet-50',
  },
];

export default function RoleSelectionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!selectedRole) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ role: selectedRole })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Both roles should complete shared onboarding first.
      router.replace('/onboarding');
    } catch (err: any) {
      setError(err?.message || 'Failed to save your role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="flex items-center gap-2 mb-10">
        <AppLogo size={36} />
        <span className="text-2xl font-bold text-foreground">InHouse</span>
      </div>

      <div className="w-full max-w-2xl">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-3">How will you use InHouse?</h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Choose your role to personalize your experience. You can always update this later in your profile settings.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {roleOptions.map((option) => {
            const isSelected = selectedRole === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setSelectedRole(option.id)}
                className={`relative text-left rounded-3xl border-2 p-6 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                  isSelected
                    ? `${option.borderColor} ${option.selectedBg} shadow-lg scale-[1.02]`
                    : 'border-border bg-card hover:border-muted-foreground/30 hover:shadow-md'
                }`}
                suppressHydrationWarning
              >
                {/* Selected indicator */}
                {isSelected && (
                  <div className={`absolute top-4 right-4 w-6 h-6 rounded-full bg-gradient-to-br ${option.gradient} flex items-center justify-center`}>
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${option.gradient} flex items-center justify-center text-white mb-4 shadow-md`}>
                  {option.icon}
                </div>

                {/* Title & Subtitle */}
                <h2 className="text-xl font-bold text-foreground mb-1">{option.title}</h2>
                <p className="text-sm text-muted-foreground mb-4">{option.subtitle}</p>

                {/* Description */}
                <p className="text-sm text-foreground/80 mb-4 leading-relaxed">{option.description}</p>

                {/* Perks */}
                <ul className="space-y-2">
                  {option.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${option.gradient} flex-shrink-0`} />
                      {perk}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedRole || loading}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 text-base"
          suppressHydrationWarning
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Continue as {selectedRole ? (selectedRole === 'chef' ? 'Chef / Vendor' : 'Customer') : '...'}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          You can change your role anytime from your profile settings.
        </p>
      </div>
    </div>
  );
}
