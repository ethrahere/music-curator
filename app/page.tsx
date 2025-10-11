'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ShareMusicModal from '@/components/ShareMusicModal';
import MusicCard from '@/components/MusicCard';
import Player from '@/components/Player';
import { MusicTrack, MusicMetadata } from '@/types/music';
import { initializeFarcaster, getUserContext, shareToFarcaster } from '@/lib/farcaster';
import { Music2, Loader2, Plus, User } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [userContext, setUserContext] = useState<{ fid: number; username: string; pfpUrl?: string } | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'electronic'>('all');
  const observerTarget = useRef<HTMLDivElement>(null);

  const LIMIT = 12;

  const fetchTracks = useCallback(async (pageNum: number, filter: 'all' | 'electronic' = 'all') => {
    if (loading) return;

    setLoading(true);
    try {
      const offset = (pageNum - 1) * LIMIT;
      const genreParam = filter === 'electronic' ? `&genre=electronic` : '';
      const response = await fetch(`/api/tracks?sort=recent&limit=${LIMIT}&offset=${offset}${genreParam}`);
      const data = await response.json();

      const newTracks = data.tracks || [];

      if (pageNum === 1) {
        setTracks(newTracks);
      } else {
        setTracks(prev => [...prev, ...newTracks]);
      }

      setHasMore(newTracks.length === LIMIT);
    } catch (error) {
      console.error('Failed to fetch tracks:', error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Initialize Farcaster SDK and get user context
    const init = async () => {
      await initializeFarcaster();
      const user = await getUserContext();
      setUserContext(user);
    };
    init();

    // Fetch initial tracks
    fetchTracks(1, selectedFilter);
  }, []);

  // Refetch when filter changes
  useEffect(() => {
    setPage(1);
    setTracks([]);
    fetchTracks(1, selectedFilter);
  }, [selectedFilter]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading]);

  // Fetch tracks when page changes
  useEffect(() => {
    if (page > 1) {
      fetchTracks(page, selectedFilter);
    }
  }, [page]);

  const handleSubmit = async (
    url: string,
    metadata: MusicMetadata,
    review?: string,
    genre?: string,
    moods?: string[]
  ) => {
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

      // Save track with optional fields
      const response = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...track,
          review: review || '',
          genre: genre || 'general',
          moods: moods || [],
        }),
      });

      const data = await response.json();

      if (data.success && data.track) {
        // Share to Farcaster using DB-generated ID
        const baseUrl = window.location.origin;
        const trackUrl = `${baseUrl}/track/${data.track.id}`;

        // Build cast text with optional review
        let castText = `🎵 ${data.track.title} - ${data.track.artist}`;
        if (review && review.trim()) {
          castText = `${review}\n\n🎵 ${data.track.title} - ${data.track.artist}`;
        }

        await shareToFarcaster(trackUrl, castText, data.track.artwork);

        // Refresh tracks with current filter
        setPage(1);
        fetchTracks(1, selectedFilter);
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
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="panel-surface px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              {/* Left: User Profile */}
              <button
                onClick={() => router.push('/profile')}
                className="flex-shrink-0 hover:opacity-80 transition-opacity"
              >
                {userContext?.pfpUrl ? (
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#a8e6c5]">
                    <Image
                      src={userContext.pfpUrl}
                      alt={userContext.username}
                      width={36}
                      height={36}
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] flex items-center justify-center">
                    <User className="w-5 h-5 text-[#0b1a12]" />
                  </div>
                )}
              </button>

              {/* Center: Logo */}
              <div className="flex-1 flex justify-center">
                <Image
                  src="/curio.png"
                  alt="Curio"
                  width={100}
                  height={32}
                  className="object-contain"
                  priority
                />
              </div>

              {/* Right: Share Music Button */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] flex items-center justify-center shadow-lg transition-all hover:scale-105"
              >
                <Plus className="w-5 h-5 text-[#0b1a12]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Share Music Modal */}
      <ShareMusicModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onSubmit={handleSubmit}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pb-8 pt-6">

        {/* Filter Pills */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-5 py-2 rounded-full font-semibold text-sm transition-all ${
              selectedFilter === 'all'
                ? 'bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] text-[#0b1a12] shadow-lg'
                : 'bg-white/40 text-[#2d4a3a] hover:bg-white/60'
            }`}
          >
            Community Curated
          </button>
          <button
            onClick={() => setSelectedFilter('electronic')}
            className={`px-5 py-2 rounded-full font-semibold text-sm transition-all ${
              selectedFilter === 'electronic'
                ? 'bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] text-[#0b1a12] shadow-lg'
                : 'bg-white/40 text-[#2d4a3a] hover:bg-white/60'
            }`}
          >
            Electronic
          </button>
        </div>

        {/* All Tracks with Infinite Scroll */}
        {tracks.length > 0 && (
          <div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tracks.map((track) => (
                <MusicCard
                  key={track.id}
                  track={track}
                  onPlay={() => setSelectedTrack(track)}
                  onTip={handleTip}
                />
              ))}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="h-20 flex items-center justify-center mt-8">
              {loading && (
                <div className="flex items-center gap-2 text-[#2d4a3a]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading more tracks...</span>
                </div>
              )}
              {!hasMore && tracks.length > 0 && (
                <p className="text-[#2d4a3a] text-sm">
                  You&apos;ve seen all the tracks! 🎵
                </p>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {tracks.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="panel-surface max-w-md mx-auto p-12">
              <Music2 className="w-16 h-16 text-[#2d4a3a] mx-auto mb-4 opacity-40" />
              <h3 className="text-xl font-semibold text-[#0b1a12] mb-2">
                Be the first curator
              </h3>
              <p className="text-sm text-[#2d4a3a]">
                Share your favorite tracks and start the conversation 🎵
              </p>
            </div>
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
          playlist={tracks}
          currentIndex={tracks.findIndex(t => t.id === selectedTrack.id)}
          onPlayNext={setSelectedTrack}
        />
      )}
    </div>
  );
}
