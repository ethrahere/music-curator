'use client';

import { useState } from 'react';
import { isValidMusicUrl, extractMusicMetadata } from '@/lib/music-parser';
import { MusicMetadata } from '@/types/music';
import { Loader2, Link as LinkIcon, Check, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface SubmitFormProps {
  onSubmit: (url: string, metadata: MusicMetadata) => void;
}

export default function SubmitForm({ onSubmit }: SubmitFormProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<MusicMetadata | null>(null);

  const handlePreview = async () => {
    setError('');
    setPreview(null);

    if (!url.trim()) {
      setError('Please enter a music link');
      return;
    }

    if (!isValidMusicUrl(url)) {
      setError('Invalid music URL. Supported: YouTube, Spotify, SoundCloud, Bandcamp');
      return;
    }

    setLoading(true);

    try {
      const metadata = await extractMusicMetadata(url);

      if (!metadata.embedUrl) {
        setError('Could not extract track information. Please check the URL.');
        setLoading(false);
        return;
      }

      setPreview(metadata);
    } catch (err) {
      setError('Failed to fetch track metadata. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (preview) {
      onSubmit(url, preview);
      setUrl('');
      setPreview(null);
    }
  };

  return (
    <div className="w-full">
      <div className="panel-surface p-6">
        <h2 className="text-xl font-bold text-[#0b1a12] mb-4">Share a Track</h2>

        {/* URL Input */}
        <div className="space-y-4">
          <div className="relative">
            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2d4a3a] opacity-50" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
              placeholder="Paste link from YouTube, Spotify, SoundCloud..."
              className="input-shell w-full !pl-12"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview Button */}
          {!preview && (
            <button
              onClick={handlePreview}
              disabled={loading || !url.trim()}
              className="btn-pastel w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading preview...</span>
                </>
              ) : (
                <span>Preview Track</span>
              )}
            </button>
          )}
        </div>

        {/* Preview Card */}
        {preview && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-white/40 border border-[#2d4a3a]/20 rounded-xl">
              <div className="flex gap-4">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                  <Image
                    src={preview.artwork}
                    alt={preview.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#0b1a12] truncate mb-1">
                    {preview.title}
                  </h3>
                  <p className="text-sm text-[#2d4a3a] truncate mb-2">
                    {preview.artist}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="pill-tag text-xs">
                      {preview.platform}
                    </span>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">Ready</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              className="btn-pastel w-full"
            >
              Share to Farcaster
            </button>

            {/* Reset */}
            <button
              onClick={() => {
                setPreview(null);
                setUrl('');
              }}
              className="w-full py-2 text-[#2d4a3a] hover:text-[#0b1a12] text-sm font-medium transition-colors"
            >
              Clear and start over
            </button>
          </div>
        )}
      </div>

      {/* Supported Platforms */}
      <div className="mt-3 text-center text-xs text-[--text-subtle]">
        YouTube Music • Spotify • SoundCloud • Bandcamp
      </div>
    </div>
  );
}
