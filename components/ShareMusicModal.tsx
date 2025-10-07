'use client';

import { useState } from 'react';
import { isValidMusicUrl, extractMusicMetadata } from '@/lib/music-parser';
import { MusicMetadata } from '@/types/music';
import { Loader2, Link as LinkIcon, Check, AlertCircle, X } from 'lucide-react';
import Image from 'next/image';

interface ShareMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, metadata: MusicMetadata, review?: string, genre?: string, moods?: string[]) => void;
}

const GENRE_OPTIONS = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'Jazz', 'Classical',
  'Country', 'Indie', 'Metal', 'Folk', 'Soul', 'Funk', 'Blues', 'Reggae', 'Other'
];

const MOOD_OPTIONS = [
  'Energetic', 'Chill', 'Happy', 'Melancholic', 'Romantic', 'Angry',
  'Relaxing', 'Uplifting', 'Dark', 'Dreamy', 'Nostalgic', 'Intense'
];

export default function ShareMusicModal({ isOpen, onClose, onSubmit }: ShareMusicModalProps) {
  const [url, setUrl] = useState('');
  const [review, setReview] = useState('');
  const [genre, setGenre] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
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
      onSubmit(url, preview, review || undefined, genre || undefined, selectedMoods.length > 0 ? selectedMoods : undefined);
      handleClose();
    }
  };

  const handleClose = () => {
    setUrl('');
    setReview('');
    setGenre('');
    setSelectedMoods([]);
    setPreview(null);
    setError('');
    onClose();
  };

  const toggleMood = (mood: string) => {
    setSelectedMoods(prev =>
      prev.includes(mood)
        ? prev.filter(m => m !== mood)
        : [...prev, mood]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="panel-surface p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#0b1a12]">Share a Track</h2>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-white/50 hover:bg-white/70 flex items-center justify-center transition-all hover:scale-105"
            >
              <X className="w-5 h-5 text-[#0b1a12]" />
            </button>
          </div>

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

          {/* Preview Card & Optional Fields */}
          {preview && (
            <div className="mt-6 space-y-6">
              {/* Track Preview */}
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

              {/* Optional: Review/Why */}
              <div>
                <label className="block text-sm font-semibold text-[#0b1a12] mb-2">
                  Why are you sharing this? (Optional)
                </label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Tell others what makes this track special..."
                  rows={3}
                  maxLength={500}
                  className="input-shell w-full resize-none"
                />
                <p className="text-xs text-[#2d4a3a] mt-1 text-right">
                  {review.length}/500
                </p>
              </div>

              {/* Optional: Genre */}
              <div>
                <label className="block text-sm font-semibold text-[#0b1a12] mb-2">
                  Genre (Optional)
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="input-shell w-full"
                >
                  <option value="">Select a genre</option>
                  {GENRE_OPTIONS.map((g) => (
                    <option key={g} value={g.toLowerCase()}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional: Moods */}
              <div>
                <label className="block text-sm font-semibold text-[#0b1a12] mb-2">
                  Moods (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOOD_OPTIONS.map((mood) => (
                    <button
                      key={mood}
                      onClick={() => toggleMood(mood)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        selectedMoods.includes(mood)
                          ? 'bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] text-[#0b1a12]'
                          : 'bg-white/40 text-[#2d4a3a] hover:bg-white/60'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
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
                  setReview('');
                  setGenre('');
                  setSelectedMoods([]);
                }}
                className="w-full py-2 text-[#2d4a3a] hover:text-[#0b1a12] text-sm font-medium transition-colors"
              >
                Clear and start over
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
