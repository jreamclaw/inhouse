'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ImagePlus, Video, X, MapPin, ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreatePostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      toast.error('Please select an image or video file');
      return;
    }

    if (file.size > 52428800) {
      toast.error('File size must be under 50MB');
      return;
    }

    setMediaFile(file);
    setMediaType(isVideo ? 'video' : 'image');
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
  }, []);

  const handleRemoveMedia = useCallback(() => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('You must be logged in to post');
      return;
    }
    if (!mediaFile) {
      toast.error('Please select an image or video');
      return;
    }
    if (!caption.trim()) {
      toast.error('Please add a caption');
      return;
    }

    setUploading(true);
    try {
      // Upload media to storage
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, mediaFile, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(uploadData.path);

      // Insert post record
      const { error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          caption: caption.trim(),
          media_url: publicUrl,
          media_type: mediaType,
          location: location.trim() || null,
        });

      if (insertError) throw insertError;

      toast.success('Post shared successfully!');
      router.push('/home-feed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-500">Back</span>
          </button>
          <h1 className="text-lg font-700 text-foreground">New Post</h1>
          <button
            onClick={handleSubmit}
            disabled={uploading || !mediaFile || !caption.trim()}
            className="text-sm font-700 text-primary disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary/80 transition-colors flex items-center gap-1.5"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sharing...
              </>
            ) : (
              'Share'
            )}
          </button>
        </div>

        {/* Media Upload Area */}
        {!mediaPreview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative aspect-square rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 mb-6"
          >
            <div className="flex gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ImagePlus className="w-7 h-7 text-primary" />
              </div>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Video className="w-7 h-7 text-primary" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-base font-600 text-foreground">Add Photo or Video</p>
              <p className="text-sm text-muted-foreground mt-1">Tap to select from your device</p>
              <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, GIF, MP4 · Max 50MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted mb-6">
            {mediaType === 'video' ? (
              <video
                src={mediaPreview}
                className="w-full h-full object-cover"
                controls
                muted
              />
            ) : (
              <img
                src={mediaPreview}
                alt="Post preview"
                className="w-full h-full object-cover"
              />
            )}
            <button
              onClick={handleRemoveMedia}
              className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
              aria-label="Remove media"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            {mediaType === 'video' && (
              <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-600 px-2 py-1 rounded-full">
                Video
              </div>
            )}
          </div>
        )}

        {/* Caption */}
        <div className="mb-4">
          <label className="block text-sm font-600 text-foreground mb-2">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            rows={4}
            maxLength={2200}
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">{caption.length}/2200</p>
        </div>

        {/* Location */}
        <div className="mb-6">
          <label className="block text-sm font-600 text-foreground mb-2">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location (optional)"
              className="w-full bg-muted rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>

        {/* Share Button (mobile) */}
        <button
          onClick={handleSubmit}
          disabled={uploading || !mediaFile || !caption.trim()}
          className="w-full bg-primary text-white font-700 py-3.5 rounded-2xl hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sharing your post...
            </>
          ) : (
            'Share Post'
          )}
        </button>
      </div>
    </AppLayout>
  );
}
