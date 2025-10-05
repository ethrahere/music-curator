'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MusicTrack } from '@/types/music';
import MusicCard from '@/components/MusicCard';
import Player from '@/components/Player';
import { TrendingUp, Clock, Music2, ArrowLeft } from 'lucide-react';

type SortOption = 'recent' | 'most_tipped';

export default function FeedPage() {
  const router = useRouter();
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
    <div className="min-h-screen">
      {/* Header - Floating Nav */}
      <header className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="panel-surface px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Back & Title */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/')}
                  className="btn-ghost flex items-center gap-2 px-3 py-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Back</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] flex items-center justify-center shadow-lg">
                    <Music2 className="w-6 h-6 text-[#0b1a12]" />
                  </div>
                  <h1 className="text-xl font-bold text-[#0b1a12]">Discover</h1>
                </div>
              </div>

              {/* Sort Options */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSort('recent')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    sort === 'recent'
                      ? 'bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] text-[#0b1a12] shadow-md'
                      : 'bg-white/40 text-[#2d4a3a] hover:bg-white/60'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-semibold">Recent</span>
                </button>
                <button
                  onClick={() => setSort('most_tipped')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    sort === 'most_tipped'
                      ? 'bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] text-[#0b1a12] shadow-md'
                      : 'bg-white/40 text-[#2d4a3a] hover:bg-white/60'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-semibold">Top Tipped</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="panel-surface px-8 py-6">
              <div className="text-[#2d4a3a]">Loading tracks...</div>
            </div>
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="panel-surface max-w-md mx-auto p-12 text-center">
              <Music2 className="w-16 h-16 text-[#2d4a3a] mx-auto mb-4 opacity-40" />
              <h3 className="text-xl font-semibold text-[#0b1a12] mb-2">No tracks yet</h3>
              <p className="text-sm text-[#2d4a3a]">Be the first to share some music!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
