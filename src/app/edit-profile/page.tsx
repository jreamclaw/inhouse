'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, User, MapPin, AtSign, FileText, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import AppLayout from '@/components/AppLayout';

export default function EditProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isChef = profile?.role === 'chef';

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setAvatarUrl(profile.avatar_url || null);
      // @ts-ignore — cover_url added via migration
      setCoverUrl(profile.cover_url || null);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  const uploadImage = async (
    file: File,
    type: 'avatar' | 'cover'
  ): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('posts')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast.error('Image upload failed');
      return null;
    }
    const { data } = supabase.storage.from('posts').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const url = await uploadImage(file, 'avatar');
    if (url) setAvatarUrl(url);
    setUploadingAvatar(false);
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const url = await uploadImage(file, 'cover');
    if (url) setCoverUrl(url);
    setUploadingCover(false);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        location: location.trim() || null,
        avatar_url: avatarUrl,
        cover_url: coverUrl,
        updated_at: new Date().toISOString(),
      };

      // Only update username if changed and non-empty
      const trimmedUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
      if (trimmedUsername && trimmedUsername !== profile?.username) {
        // Check uniqueness
        const { data: existing } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('username', trimmedUsername)
          .neq('id', user.id)
          .maybeSingle();
        if (existing) {
          toast.error('Username already taken');
          setSaving(false);
          return;
        }
        updates.username = trimmedUsername;
      } else if (trimmedUsername) {
        updates.username = trimmedUsername;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Profile updated!');
      router.back();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto xl:max-w-screen-lg xl:mx-0 xl:px-6 2xl:px-10">
        {/* Header */}
        <div className="sticky top-14 z-30 bg-card/95 backdrop-blur-md border-b border-border/60 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-600 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancel
          </button>
          <h1 className="text-base font-700 text-foreground">Edit Profile</h1>
          <button
            onClick={handleSave}
            disabled={saving || uploadingAvatar || uploadingCover}
            className="flex items-center gap-1.5 text-sm font-700 text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Save
          </button>
        </div>

        {/* Cover Image */}
        <div className="relative h-36 sm:h-48 bg-muted overflow-hidden">
          {coverUrl ? (
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div
              className={`w-full h-full ${
                isChef
                  ? 'bg-gradient-to-br from-orange-400 to-amber-500' :'bg-gradient-to-br from-violet-400 to-purple-500'
              }`}
            />
          )}
          <div className="absolute inset-0 bg-black/20" />
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="absolute inset-0 flex items-center justify-center gap-2 text-white text-sm font-600 hover:bg-black/10 transition-colors"
          >
            {uploadingCover ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Camera className="w-5 h-5" />
                Change Cover
              </>
            )}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleCoverChange}
          />
        </div>

        {/* Avatar */}
        <div className="px-4 -mt-12 mb-6 flex items-end gap-4">
          <div className="relative shrink-0">
            <div
              className={`w-24 h-24 rounded-full overflow-hidden border-4 ${
                isChef ? 'border-primary' : 'border-card'
              } bg-muted shadow-lg`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div
                  className={`w-full h-full flex items-center justify-center text-3xl font-bold text-white ${
                    isChef
                      ? 'bg-gradient-to-br from-orange-400 to-amber-500' :'bg-gradient-to-br from-violet-400 to-purple-500'
                  }`}
                >
                  {(fullName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-card shadow-md hover:bg-primary/90 transition-colors"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-white" />
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="pb-1">
            <p className="text-xs text-muted-foreground">Tap the camera icon to change your photo</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="px-4 pb-10 space-y-5">
          {/* Full Name */}
          <div>
            <label className="flex items-center gap-2 text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">
              <User className="w-3.5 h-3.5" />
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              maxLength={60}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
            />
          </div>

          {/* Username */}
          <div>
            <label className="flex items-center gap-2 text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">
              <AtSign className="w-3.5 h-3.5" />
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="username"
                maxLength={30}
                className="w-full bg-muted rounded-xl pl-8 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Letters, numbers, and underscores only</p>
          </div>

          {/* Bio */}
          <div>
            <label className="flex items-center gap-2 text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">
              <FileText className="w-3.5 h-3.5" />
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={isChef ? 'Tell customers about your cooking style...' : 'Tell people about yourself...'}
              maxLength={160}
              rows={3}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none transition-all resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1.5 text-right">{bio.length}/160</p>
          </div>

          {/* Location */}
          <div>
            <label className="flex items-center gap-2 text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">
              <MapPin className="w-3.5 h-3.5" />
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State"
              maxLength={80}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
            />
          </div>

          {/* Save Button (bottom) */}
          <button
            onClick={handleSave}
            disabled={saving || uploadingAvatar || uploadingCover}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-700 text-sm py-3.5 rounded-2xl hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm shadow-primary/20 mt-4"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
