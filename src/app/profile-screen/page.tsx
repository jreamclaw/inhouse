'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import ProfileHeader from './components/ProfileHeader';
import ProfileTabs from './components/ProfileTabs';
import { useAuth } from '@/contexts/AuthContext';
import { ProfilePageSkeleton } from '@/components/ui/SkeletonLoaders';

export default function ProfileScreenPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router?.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto xl:max-w-screen-lg xl:mx-0 xl:px-6 2xl:px-10">
          <ProfilePageSkeleton />
        </div>
      </AppLayout>
    );
  }

  if (!user) return null;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pt-3 xl:max-w-screen-lg xl:mx-0 xl:px-6 2xl:px-10">
        <ProfileHeader />
        <ProfileTabs />
      </div>
    </AppLayout>
  );
}