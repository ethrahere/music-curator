'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SubmitForm from '@/components/SubmitForm';
import MusicCard from '@/components/MusicCard';
import Player from '@/components/Player';
import { MusicTrack, MusicMetadata } from '@/types/music';
import { initializeFarcaster, getUserContext, shareToFarcaster } from '@/lib/farcaster';
import { Music2, TrendingUp } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [featuredTracks, setFeaturedTracks] = useState<MusicTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);

  const fetchFeaturedTracks = useCallback(async () => {
    try {
      const response = await fetch('/api/tracks?sort=most_tipped&limit=4');
      const data = await response.json();
      setFeaturedTracks(data.tracks || []);
    } catch (error) {
      console.error('Failed to fetch featured tracks:', error);
    }
  }, []);

  useEffect(() => {
    // Initialize Farcaster SDK
    initializeFarcaster();

    // Fetch featured tracks
    fetchFeaturedTracks();
  }, [fetchFeaturedTracks]);

  const handleSubmit = async (url: string, metadata: MusicMetadata) => {
    try {
      // Get user context
      const user = await getUserContext();

      // Create track
      const track: MusicTrack = {
        id: Date.now().toString(),
        url,
        platform: metadata.platform,
        title: metadata.title,
        artist: metadata.artist,
        artwork: metadata.artwork,
        embedUrl: metadata.embedUrl,
        tips: 0,
        sharedBy: user,
        timestamp: Date.now(),
      };

      // Save track
      const response = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(track),
      });

      const data = await response.json();

      if (data.success) {
        // Share to Farcaster
        const baseUrl = window.location.origin;
        const trackUrl = `${baseUrl}/track/${track.id}`;
        await shareToFarcaster(trackUrl, `🎵 ${track.title} - ${track.artist}`);

        // Refresh featured tracks
        fetchFeaturedTracks();
      }
    } catch (error) {
      console.error('Failed to submit track:', error);
    }
  };

  const handleTip = async (trackId: string) => {
    try {
      const response = await fetch(`/api/tracks/${trackId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tip' }),
      });
      const data = await response.json();
      if (data.success) {
        setFeaturedTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, tips: t.tips + 1 } : t))
        );
        if (selectedTrack?.id === trackId) {
          setSelectedTrack({ ...selectedTrack, tips: selectedTrack.tips + 1 });
        }
      }
    } catch (error) {
      console.error('Failed to tip track:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-black/30">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Music2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Music Curator</h1>
                <p className="text-xs text-white/60">Share & discover music</p>
              </div>
            </div>

            <button
              onClick={() => router.push('/feed')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Discover</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Submit Form */}
        <div className="mb-16">
          <SubmitForm onSubmit={handleSubmit} />
        </div>

        {/* Featured Tracks */}
        {featuredTracks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-white/80" />
              <h2 className="text-xl font-bold text-white">Top Tipped Tracks</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredTracks.map((track) => (
                <MusicCard
                  key={track.id}
                  track={track}
                  onPlay={setSelectedTrack}
                  onTip={handleTip}
                />
              ))}
            </div>

            <div className="text-center mt-8">
              <button
                onClick={() => router.push('/feed')}
                className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-colors"
              >
                View All Tracks
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {featuredTracks.length === 0 && (
          <div className="text-center py-12">
            <Music2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white/60 mb-2">
              No tracks yet
            </h3>
            <p className="text-sm text-white/40">
              Be the first to share music on Music Curator!
            </p>
          </div>
        )}
      </main>

      {/* Player Modal */}
      {selectedTrack && (
        <Player
          track={selectedTrack}
          onClose={() => setSelectedTrack(null)}
          onTip={handleTip}
          baseUrl={typeof window !== 'undefined' ? window.location.origin : ''}
        />
      )}
    </div>
  );
}
