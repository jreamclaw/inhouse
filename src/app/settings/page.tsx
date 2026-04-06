'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  Lock,
  UserX,
  LogOut,
  ChevronRight,
  Loader2,
  Trash2,
  Shield,
  Eye,
  MapPin,
  Activity,
  Headphones,
  Heart,
  MessageCircle,
  UserPlus,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import AppLayout from '@/components/AppLayout';

interface UserSettings {
  notif_new_follower: boolean;
  notif_post_likes: boolean;
  notif_comments: boolean;
  notif_order_updates: boolean;
  notif_promotions: boolean;
  privacy_public_profile: boolean;
  privacy_show_location: boolean;
  privacy_show_activity: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  notif_new_follower: true,
  notif_post_likes: true,
  notif_comments: true,
  notif_order_updates: true,
  notif_promotions: false,
  privacy_public_profile: true,
  privacy_show_location: true,
  privacy_show_activity: true,
};

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
        checked ? 'bg-primary' : 'bg-border'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setSettings({
          notif_new_follower: data.notif_new_follower ?? true,
          notif_post_likes: data.notif_post_likes ?? true,
          notif_comments: data.notif_comments ?? true,
          notif_order_updates: data.notif_order_updates ?? true,
          notif_promotions: data.notif_promotions ?? false,
          privacy_public_profile: data.privacy_public_profile ?? true,
          privacy_show_location: data.privacy_show_location ?? true,
          privacy_show_activity: data.privacy_show_activity ?? true,
        });
      }
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof UserSettings, value: boolean) => {
    if (!user) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          { user_id: user.id, ...updated, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
    } catch {
      // revert on error
      setSettings(settings);
      toast.error('Failed to save setting');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      router.replace('/login');
    } catch {
      toast.error('Failed to log out');
      setLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    toast.error('Account deletion requires contacting support. Please email support@inhousapp.net');
    setShowDeleteConfirm(false);
  };

  if (!user) return null;

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto xl:max-w-screen-lg xl:mx-0 xl:px-6 2xl:px-10">
        {/* Header */}
        <div className="sticky top-14 z-30 bg-card/95 backdrop-blur-md border-b border-border/60 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <h1 className="text-base font-700 text-foreground">Settings</h1>
          {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="pb-10">
            {/* Account Info */}
            <div className="px-4 py-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold text-white ${
                    profile?.role === 'chef' ?'bg-gradient-to-br from-orange-400 to-amber-500' :'bg-gradient-to-br from-violet-400 to-purple-500'
                  }`}
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-sm font-700 text-foreground">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </div>
                <button
                  onClick={() => router.push('/edit-profile')}
                  className="ml-auto text-xs font-600 text-primary hover:text-primary/80 transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="px-4 pt-6 pb-2">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-700 text-foreground">Notifications</h2>
              </div>
              <div className="bg-muted/40 rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/60">
                <SettingRow
                  icon={<UserPlus className="w-4 h-4 text-blue-500" />}
                  label="New Followers"
                  description="When someone follows you"
                  checked={settings.notif_new_follower}
                  onChange={(v) => updateSetting('notif_new_follower', v)}
                />
                <SettingRow
                  icon={<Heart className="w-4 h-4 text-red-500" />}
                  label="Post Likes"
                  description="When someone likes your post"
                  checked={settings.notif_post_likes}
                  onChange={(v) => updateSetting('notif_post_likes', v)}
                />
                <SettingRow
                  icon={<MessageCircle className="w-4 h-4 text-green-500" />}
                  label="Comments"
                  description="When someone comments on your post"
                  checked={settings.notif_comments}
                  onChange={(v) => updateSetting('notif_comments', v)}
                />
                <SettingRow
                  icon={<ShoppingBag className="w-4 h-4 text-amber-500" />}
                  label="Order Updates"
                  description="Status changes on your orders"
                  checked={settings.notif_order_updates}
                  onChange={(v) => updateSetting('notif_order_updates', v)}
                />
                <SettingRow
                  icon={<Tag className="w-4 h-4 text-purple-500" />}
                  label="Promotions & Deals"
                  description="Special offers from chefs you follow"
                  checked={settings.notif_promotions}
                  onChange={(v) => updateSetting('notif_promotions', v)}
                />
              </div>
            </div>

            {/* Privacy */}
            <div className="px-4 pt-6 pb-2">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-700 text-foreground">Privacy</h2>
              </div>
              <div className="bg-muted/40 rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/60">
                <SettingRow
                  icon={<Eye className="w-4 h-4 text-blue-500" />}
                  label="Public Profile"
                  description="Anyone can view your profile"
                  checked={settings.privacy_public_profile}
                  onChange={(v) => updateSetting('privacy_public_profile', v)}
                />
                <SettingRow
                  icon={<MapPin className="w-4 h-4 text-green-500" />}
                  label="Show Location"
                  description="Display your location on your profile"
                  checked={settings.privacy_show_location}
                  onChange={(v) => updateSetting('privacy_show_location', v)}
                />
                <SettingRow
                  icon={<Activity className="w-4 h-4 text-orange-500" />}
                  label="Activity Status"
                  description="Show when you were last active"
                  checked={settings.privacy_show_activity}
                  onChange={(v) => updateSetting('privacy_show_activity', v)}
                />
              </div>
            </div>

            {/* Account Management */}
            <div className="px-4 pt-6 pb-2">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-700 text-foreground">Account</h2>
              </div>
              <div className="bg-muted/40 rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/60">
                <button
                  onClick={() => router.push('/change-password')}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-600 text-foreground">Change Password</p>
                      <p className="text-xs text-muted-foreground">Update your account password</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => router.push('/edit-profile')}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <UserX className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-600 text-foreground">Edit Profile</p>
                      <p className="text-xs text-muted-foreground">Update your name, bio, and photo</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => router.push('/support')}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Headphones className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-600 text-foreground">Support</p>
                      <p className="text-xs text-muted-foreground">Get help with account, orders, or app issues</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Logout */}
            <div className="px-4 pt-6 pb-2">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border border-border/60 bg-muted/40 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-sm font-600 text-foreground transition-all duration-150"
              >
                {loggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                {loggingOut ? 'Logging out...' : 'Log Out'}
              </button>
            </div>

            {/* Danger Zone */}
            <div className="px-4 pt-4 pb-2">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2.5 py-3 text-xs font-600 text-red-500/70 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Account
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-sm font-700 text-red-700 mb-1">Delete your account?</p>
                  <p className="text-xs text-red-600 mb-4">
                    This action cannot be undone. All your data will be permanently removed.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl border border-border text-sm font-600 text-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-700 hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function SettingRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm font-600 text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}
