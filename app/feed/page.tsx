'use client';

import { useEffect, useState, useCallback } from 'react';
import { MusicTrack } from '@/types/music';
import MusicCard from '@/components/MusicCard';
import Player from '@/components/Player';
import { TrendingUp, Clock, Filter } from 'lucide-react';

type SortOption = 'recent' | 'most_tipped';

export default function FeedPage() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>('recent');
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);

  const fetchTracks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tracks?sort=${sort}&limit=50`);
      const data = await response.json();
      setTracks(data.tracks || []);
    } catch (error) {
      console.error('Failed to fetch tracks:', error);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const handleTip = async (trackId: string) => {
    try {
      const response = await fetch(`/api/tracks/${trackId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tip' }),
      });
      const data = await response.json();
      if (data.success) {
        // Update local state
        setTracks((prev) =>
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
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Discover Music</h1>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-white/40" />
              <button
                onClick={() => setSort('recent')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  sort === 'recent'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Recent</span>
              </button>
              <button
                onClick={() => setSort('most_tipped')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  sort === 'most_tipped'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Top Tipped</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-white/60">Loading tracks...</div>
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-white/60 text-center">
              <p className="text-lg mb-2">No tracks yet</p>
              <p className="text-sm">Be the first to share some music!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tracks.map((track) => (
              <MusicCard
                key={track.id}
                track={track}
                onPlay={setSelectedTrack}
                onTip={handleTip}
              />
            ))}
          </div>
        )}
      </div>

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
