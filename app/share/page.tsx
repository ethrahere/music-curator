'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isValidMusicUrl, extractMusicMetadata } from '@/lib/music-parser';
import { MusicMetadata } from '@/types/music';
import { Loader2, Link as LinkIcon, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { getUserContext, initializeFarcaster } from '@/lib/farcaster';
import BottomNav from '@/components/BottomNav';

const GENRE_OPTIONS = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'Jazz', 'Classical',
  'Country', 'Indie', 'Metal', 'Folk', 'Soul', 'Funk', 'Blues', 'Reggae', 'Other'
];

const MOOD_OPTIONS = [
  'Energetic', 'Chill', 'Happy', 'Melancholic', 'Romantic', 'Angry',
  'Relaxing', 'Uplifting', 'Dark', 'Dreamy', 'Nostalgic', 'Intense'
];

export default function SharePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [review, setReview] = useState('');
  const [genre, setGenre] = useState('');
  const [genreInput, setGenreInput] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [customMood, setCustomMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<MusicMetadata | null>(null);
  const [userContext, setUserContext] = useState<{ fid: number; username: string; pfpUrl?: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      await initializeFarcaster();
      const user = await getUserContext();
      setUserContext(user);
    };
    init();
  }, []);

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

  const handleSubmit = async () => {
    if (!preview) return;

    setSubmitting(true);
    setError('');

    try {
      const user = await getUserContext();

      const finalGenre = genreInput.trim() || genre;
      const finalMoods = selectedMoods.length > 0 ? selectedMoods : undefined;

      const response = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          curatorFid: user.fid,
          curatorUsername: user.username,
          curatorPfpUrl: user.pfpUrl,
          curatorWalletAddress: user.walletAddress,
          embedUrl: preview.embedUrl,
          title: preview.title,
          artist: preview.artist,
          artwork: preview.artwork,
          platform: preview.platform,
          review: review || undefined,
          genre: finalGenre || undefined,
          moods: finalMoods,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push('/profile');
      } else {
        setError(data.error || 'Failed to share track');
      }
    } catch (err) {
      setError('Failed to share track. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMood = (mood: string) => {
    setSelectedMoods(prev =>
      prev.includes(mood)
        ? prev.filter(m => m !== mood)
        : [...prev, mood]
    );
  };

  const addCustomMood = () => {
    if (customMood.trim() && !selectedMoods.includes(customMood.trim())) {
      setSelectedMoods(prev => [...prev, customMood.trim()]);
      setCustomMood('');
    }
  };

  const removeMood = (mood: string) => {
    setSelectedMoods(prev => prev.filter(m => m !== mood));
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="panel-surface px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-[#0b1a12]">Share a Track</h1>
              <LinkIcon className="w-6 h-6 text-[#a8e6c5]" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pt-4">
        <div className="max-w-2xl mx-auto">
        <div className="space-y-6">
          {/* URL Input */}
          <div className="panel-surface p-6">
            <label className="block text-sm font-semibold text-[#0b1a12] mb-3 lowercase">
              paste music link
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2d4a3a] opacity-50" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
                placeholder="YouTube, Spotify, SoundCloud, Bandcamp..."
                className="input-shell w-full !pl-12"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg mt-3">
                <AlertCircle className="w-4 h-4" />
                <span className="lowercase">{error}</span>
              </div>
            )}

            {!preview && (
              <button
                onClick={handlePreview}
                disabled={loading || !url.trim()}
                className="w-full mt-4 flex items-center justify-center gap-2 py-4 px-4 rounded-[18px] font-semibold text-[#2E2E2E] transition-all duration-150 hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed lowercase"
                style={{
                  background: '#F6F6F6',
                  boxShadow: '4px 4px 8px #d0d0d0, -4px -4px 8px #ffffff',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>loading preview...</span>
                  </>
                ) : (
                  <span>preview track</span>
                )}
              </button>
            )}
          </div>

          {/* Preview and Details */}
          {preview && (
            <>
              {/* Track Preview */}
              <div className="panel-surface p-6">
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
                    <h3 className="font-semibold text-[#0b1a12] truncate mb-1 lowercase">
                      {preview.title}
                    </h3>
                    <p className="text-sm text-[#2d4a3a] truncate mb-2 lowercase">
                      {preview.artist}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="pill-tag text-xs lowercase">{preview.platform}</span>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600 font-medium lowercase">ready</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review */}
              <div className="panel-surface p-6">
                <label className="block text-sm font-semibold text-[#0b1a12] mb-3 lowercase">
                  why are you sharing this? (optional)
                </label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Tell others what makes this track special..."
                  rows={3}
                  maxLength={500}
                  className="input-shell w-full resize-none lowercase"
                />
                <p className="text-xs text-[#2d4a3a] mt-2 text-right">
                  {review.length}/500
                </p>
              </div>

              {/* Genre - Typable with Autocomplete */}
              <div className="panel-surface p-6">
                <label className="block text-sm font-semibold text-[#0b1a12] mb-3 lowercase">
                  genre (optional)
                </label>

                <input
                  type="text"
                  value={genreInput || genre}
                  onChange={(e) => {
                    setGenreInput(e.target.value);
                    setGenre('');
                  }}
                  placeholder="Type a genre or select from suggestions..."
                  className="input-shell w-full lowercase mb-3"
                />

                {/* Genre Pills */}
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map((g) => (
                    <button
                      key={g}
                      onClick={() => {
                        setGenre(g.toLowerCase());
                        setGenreInput(g);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all lowercase ${
                        (genreInput === g || genre === g.toLowerCase())
                          ? 'bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] text-[#0b1a12]'
                          : 'bg-white/50 text-[#2d4a3a] hover:bg-white/70'
                      }`}
                    >
                      {g.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Moods - Pills + Custom Input */}
              <div className="panel-surface p-6">
                <label className="block text-sm font-semibold text-[#0b1a12] mb-3 lowercase">
                  moods (optional)
                </label>

                {/* Selected Moods */}
                {selectedMoods.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedMoods.map((mood) => (
                      <div
                        key={mood}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] text-[#0b1a12] flex items-center gap-2 lowercase"
                      >
                        {mood.toLowerCase()}
                        <button
                          onClick={() => removeMood(mood)}
                          className="hover:scale-110 transition-transform"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Preset Mood Options */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {MOOD_OPTIONS.filter(m => !selectedMoods.includes(m)).map((mood) => (
                    <button
                      key={mood}
                      onClick={() => toggleMood(mood)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/50 text-[#2d4a3a] hover:bg-white/70 transition-all lowercase"
                    >
                      {mood.toLowerCase()}
                    </button>
                  ))}
                </div>

                {/* Custom Mood Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customMood}
                    onChange={(e) => setCustomMood(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomMood()}
                    placeholder="Add custom mood..."
                    className="input-shell flex-1 lowercase"
                  />
                  <button
                    onClick={addCustomMood}
                    disabled={!customMood.trim()}
                    className="btn-neomorph px-6 disabled:opacity-50 lowercase"
                  >
                    add
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-pastel w-full disabled:opacity-50 lowercase"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    sharing...
                  </span>
                ) : (
                  'share to farcaster'
                )}
              </button>

              <button
                onClick={() => {
                  setPreview(null);
                  setUrl('');
                  setReview('');
                  setGenre('');
                  setGenreInput('');
                  setSelectedMoods([]);
                  setCustomMood('');
                }}
                className="btn-ghost w-full lowercase"
              >
                clear and start over
              </button>
            </>
          )}
        </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        userPfpUrl={userContext?.pfpUrl}
      />
    </div>
  );
}
