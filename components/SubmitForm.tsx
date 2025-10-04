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
    <div className="w-full max-w-2xl mx-auto">
      <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Share Music</h2>

        {/* URL Input */}
        <div className="space-y-4">
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
              placeholder="Paste YouTube, Spotify, SoundCloud, or Bandcamp link..."
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview Button */}
          {!preview && (
            <button
              onClick={handlePreview}
              disabled={loading || !url.trim()}
              className="w-full py-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed border border-white/20 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
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
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex gap-4">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={preview.artwork}
                    alt={preview.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate mb-1">
                    {preview.title}
                  </h3>
                  <p className="text-sm text-white/60 truncate mb-2">
                    {preview.artist}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/80 capitalize">
                      {preview.platform}
                    </span>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400">Ready to share</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg text-white font-semibold transition-all shadow-lg shadow-purple-500/25"
            >
              Share to Farcaster
            </button>

            {/* Reset */}
            <button
              onClick={() => {
                setPreview(null);
                setUrl('');
              }}
              className="w-full py-2 text-white/60 hover:text-white text-sm transition-colors"
            >
              Clear and start over
            </button>
          </div>
        )}
      </div>

      {/* Supported Platforms */}
      <div className="mt-4 text-center text-xs text-white/40">
        Supported: YouTube Music • Spotify • SoundCloud • Bandcamp
      </div>
    </div>
  );
}
