'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ImagePlus, Loader2, Video, X } from 'lucide-react';
import { toast } from 'sonner';

type StoryMedia = {
  file: File;
  preview: string;
  type: 'image' | 'video';
};

export default function CreateStoryPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [media, setMedia] = useState<StoryMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const storyPolicyLabel = useMemo(() => {
    if (profile?.role === 'chef') return 'Chef story';
    if (profile?.role === 'customer') return 'Your story';
    return 'Your story';
  }, [profile?.role]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      toast.error('Please select an image or video');
      return;
    }

    if (file.size > 52428800) {
      toast.error('Story media must be under 50MB');
      return;
    }

    setMedia({
      file,
      preview: URL.createObjectURL(file),
      type: isVideo ? 'video' : 'image',
    });

    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to post a story');
      return;
    }

    if (!media) {
      toast.error('Select an image or video first');
      return;
    }

    setUploading(true);
    try {
      const ext = media.file.name.split('.').pop() || 'bin';
      const filePath = `${user.id}/stories/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const upload = await supabase.storage.from('posts').upload(filePath, media.file, { upsert: false });
      if (upload.error) throw upload.error;

      const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(upload.data.path);

      const insert = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: media.type,
          caption: caption.trim() || null,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

      if (insert.error) throw insert.error;

      toast.success('Story posted');
      router.push('/home-feed');
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to post story');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-500">Back</span>
          </button>
          <h1 className="text-lg font-700 text-foreground">Create Story</h1>
          <button
            onClick={handleSubmit}
            disabled={uploading || !media}
            className="text-sm font-700 text-primary disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary/80 transition-colors flex items-center gap-1.5"
          >
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Posting...</> : 'Post Story'}
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-sm font-700 text-foreground">{storyPolicyLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">Stories stay live for 24 hours, then automatically expire from the feed.</p>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          className="relative rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 mb-6 p-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ImagePlus className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-base font-600 text-foreground">Add image or video</p>
            <p className="text-sm text-muted-foreground mt-1">One image or video per story</p>
            <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, GIF, WEBP, MP4, MOV, WEBM · Max 50MB</p>
          </div>
          <input ref={inputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
        </div>

        {media && (
          <div className="relative rounded-2xl overflow-hidden bg-muted mb-6 border border-border">
            <button
              onClick={() => setMedia(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
              aria-label="Remove story media"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            {media.type === 'video' ? (
              <video src={media.preview} className="w-full max-h-[520px] object-cover bg-black" controls muted playsInline />
            ) : (
              <img src={media.preview} alt="Story preview" className="w-full max-h-[520px] object-cover" />
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 text-white text-xs font-600 px-3 py-1.5 rounded-full">
              {media.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <ImagePlus className="w-3.5 h-3.5" />}
              {media.type === 'video' ? 'Video story' : 'Photo story'}
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-600 text-foreground mb-2">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption (optional)"
            rows={3}
            maxLength={300}
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">{caption.length}/300</p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={uploading || !media}
          className="w-full bg-primary text-white font-700 py-3.5 rounded-2xl hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          {uploading ? <><Loader2 className="w-5 h-5 animate-spin" />Posting story...</> : 'Share Story'}
        </button>
      </div>
    </AppLayout>
  );
}
