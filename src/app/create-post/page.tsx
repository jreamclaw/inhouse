'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ImagePlus, X, MapPin, ChevronLeft, Loader2, AtSign } from 'lucide-react';
import { toast } from 'sonner';

type MediaItem = {
  file: File;
  preview: string;
  type: 'image' | 'video';
};

type TaggableUser = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: 'chef' | 'customer' | null;
};

export default function CreatePostPage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const supabase = createClient();

  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [tagResults, setTagResults] = useState<TaggableUser[]>([]);
  const [selectedTags, setSelectedTags] = useState<TaggableUser[]>([]);
  const [tagLoading, setTagLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const nextItems: MediaItem[] = [];
    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) {
        toast.error('Please select images or videos only');
        continue;
      }
      if (file.size > 52428800) {
        toast.error('Each file must be under 50MB');
        continue;
      }
      nextItems.push({
        file,
        type: isVideo ? 'video' : 'image',
        preview: URL.createObjectURL(file),
      });
    }

    setMediaItems((prev) => {
      const combined = [...prev, ...nextItems].slice(0, 5);
      if (prev.length + nextItems.length > 5) {
        toast.error('You can upload up to 5 media files per post');
      }
      return combined;
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleRemoveMedia = useCallback((index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const searchUsers = useCallback(async (query: string) => {
    const value = query.trim();
    if (!value || value.length < 2) {
      setTagResults([]);
      return;
    }

    setTagLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, username, avatar_url, role')
        .or(`username.ilike.%${value}%,full_name.ilike.%${value}%`)
        .limit(8);

      if (error) throw error;
      const selectedIds = new Set(selectedTags.map((tag) => tag.id));
      setTagResults(((data || []) as TaggableUser[]).filter((item) => item.id !== user?.id && !selectedIds.has(item.id)));
    } catch {
      setTagResults([]);
    } finally {
      setTagLoading(false);
    }
  }, [selectedTags, supabase, user?.id]);

  const handleSubmit = async () => {
    if (!user) return toast.error('You must be logged in to post');
    if (!mediaItems.length) return toast.error('Please select at least one image or video');
    if (!caption.trim()) return toast.error('Please add a caption');

    setUploading(true);
    try {
      const uploadedMedia: { media_url: string; media_type: 'image' | 'video'; sort_order: number }[] = [];

      for (const [index, item] of mediaItems.entries()) {
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, item.file, { upsert: false });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(uploadData.path);
        uploadedMedia.push({ media_url: publicUrl, media_type: item.type, sort_order: index });
      }

      const coverMedia = uploadedMedia[0];
      let createdPostId: string | null = null;

      let postInsert = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          caption: caption.trim(),
          media_url: coverMedia.media_url,
          media_type: coverMedia.media_type,
          location: location.trim() || null,
        })
        .select('id')
        .single();

      if (postInsert.error && String(postInsert.error.message || '').includes('media_type')) {
        postInsert = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            caption: caption.trim(),
            media_url: coverMedia.media_url,
            location: location.trim() || null,
          })
          .select('id')
          .single();
      }

      if (postInsert.error) throw postInsert.error;
      createdPostId = postInsert.data?.id || null;
      if (!createdPostId) throw new Error('Failed to create post');

      const mediaInsert = await supabase.from('post_media').insert(
        uploadedMedia.map((media) => ({
          post_id: createdPostId,
          media_url: media.media_url,
          media_type: media.media_type,
          sort_order: media.sort_order,
        }))
      );

      if (mediaInsert.error && !String(mediaInsert.error.message || '').includes('post_media')) {
        throw mediaInsert.error;
      }

      if (selectedTags.length > 0) {
        const tagInsert = await supabase.from('post_tags').insert(
          selectedTags.map((tag) => ({
            post_id: createdPostId,
            tagged_user_id: tag.id,
            tagged_by_user_id: user.id,
          }))
        );

        if (tagInsert.error && !String(tagInsert.error.message || '').includes('post_tags')) {
          throw tagInsert.error;
        }
      }

      await refreshProfile().catch(() => undefined);
      toast.success(mediaItems.length > 1 ? 'Carousel post shared successfully!' : 'Post shared successfully!');
      window.location.assign('/profile-screen?tab=posts&refresh=' + Date.now());
      return;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft className="w-5 h-5" /><span className="text-sm font-500">Back</span></button>
          <h1 className="text-lg font-700 text-foreground">New Post</h1>
          <button onClick={handleSubmit} disabled={uploading || !mediaItems.length || !caption.trim()} className="text-sm font-700 text-primary disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary/80 transition-colors flex items-center gap-1.5">{uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Sharing...</> : 'Share'}</button>
        </div>

        <div onClick={() => fileInputRef.current?.click()} className="relative rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 mb-6 p-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center"><ImagePlus className="w-7 h-7 text-primary" /></div>
          <div className="text-center"><p className="text-base font-600 text-foreground">Add photos or video</p><p className="text-sm text-muted-foreground mt-1">Upload up to 5 photos or videos</p><p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, GIF, MP4 ? Max 50MB each</p></div>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} className="hidden" />
        </div>

        {mediaItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {mediaItems.map((item, index) => (
              <div key={`${item.preview}-${index}`} className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                {item.type === 'video' ? <video src={item.preview} className="w-full h-full object-cover" controls muted /> : <img src={item.preview} alt={`Post preview ${index + 1}`} className="w-full h-full object-cover" />}
                <button onClick={() => handleRemoveMedia(index)} className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors" aria-label="Remove media"><X className="w-4 h-4 text-white" /></button>
                <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs font-600 px-2 py-1 rounded-full">{index + 1}/{mediaItems.length}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4"><label className="block text-sm font-600 text-foreground mb-2">Caption</label><textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write a caption..." rows={4} maxLength={2200} className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none" /><p className="text-xs text-muted-foreground text-right mt-1">{caption.length}/2200</p></div>

        <div className="mb-4"><label className="block text-sm font-600 text-foreground mb-2">Tag People</label><div className="relative"><AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input type="text" value={tagQuery} onChange={(e) => { const value = e.target.value; setTagQuery(value); void searchUsers(value); }} placeholder="Search users to tag" className="w-full bg-muted rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all" /></div>{tagLoading ? <p className="text-xs text-muted-foreground mt-2">Searching...</p> : null}{tagResults.length > 0 && (<div className="mt-2 rounded-2xl border border-border bg-card overflow-hidden">{tagResults.map((person) => (<button key={person.id} type="button" onClick={() => { setSelectedTags((prev) => [...prev, person]); setTagQuery(''); setTagResults([]); }} className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"><div className="w-9 h-9 rounded-full overflow-hidden bg-muted shrink-0">{person.avatar_url ? <img src={person.avatar_url} alt={person.full_name || person.username || 'User'} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-foreground">{(person.full_name || person.username || 'U').charAt(0).toUpperCase()}</div>}</div><div className="min-w-0"><p className="text-sm font-600 text-foreground truncate">{person.full_name || 'User'}</p><p className="text-xs text-muted-foreground truncate">@{person.username || 'user'}</p></div></button>))}</div>)}{selectedTags.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{selectedTags.map((tag) => (<span key={tag.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-600">@{tag.username || tag.full_name || 'user'}<button type="button" onClick={() => setSelectedTags((prev) => prev.filter((item) => item.id !== tag.id))} aria-label={`Remove ${tag.username || tag.full_name || 'tag'}`}><X className="w-3 h-3" /></button></span>))}</div>}</div>

        <div className="mb-6"><label className="block text-sm font-600 text-foreground mb-2">Location</label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add location (optional)" className="w-full bg-muted rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all" /></div></div>

        <button onClick={handleSubmit} disabled={uploading || !mediaItems.length || !caption.trim()} className="w-full bg-primary text-white font-700 py-3.5 rounded-2xl hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20">{uploading ? <><Loader2 className="w-5 h-5 animate-spin" />Sharing your post...</> : `Share ${mediaItems.length > 1 ? `${mediaItems.length} Posts` : 'Post'}`}</button>
      </div>
    </AppLayout>
  );
}
