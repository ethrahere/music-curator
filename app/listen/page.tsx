'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MusicTrack } from '@/types/music';
import { Heart, ChevronUp, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { TipButton } from '@/components/TipButton';
import { getUserContext, initializeFarcaster } from '@/lib/farcaster';

function ListenPageContent() {
  const searchParams = useSearchParams();
  const trackId = searchParams.get('track');
  const curatorUsername = searchParams.get('curator');

  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userContext, setUserContext] = useState<{ fid: number; username: string; pfpUrl?: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      await initializeFarcaster();
      const user = await getUserContext();
      setUserContext(user);
    };
    init();
  }, []);

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        setLoading(true);

        // If curator is specified, fetch their tracks
        if (curatorUsername) {
          const response = await fetch(`/api/users/${curatorUsername}/tracks`);
          const data = await response.json();

          if (data.success && data.tracks) {
            setTracks(data.tracks);

            // If specific track ID is provided, find its index
            if (trackId) {
              const index = data.tracks.findIndex((t: MusicTrack) => t.id === trackId);
              if (index !== -1) {
                setCurrentIndex(index);
                // Scroll to that track
                setTimeout(() => {
                  scrollToTrack(index);
                }, 100);
              }
            }
          }
        } else {
          // Otherwise, fetch recent tracks
          const response = await fetch('/api/tracks?sort=recent&limit=20');
          const data = await response.json();

          if (data.tracks) {
            setTracks(data.tracks);

            // Find specific track if ID is provided
            if (trackId) {
              const index = data.tracks.findIndex((t: MusicTrack) => t.id === trackId);
              if (index !== -1) {
                setCurrentIndex(index);
                setTimeout(() => {
                  scrollToTrack(index);
                }, 100);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch tracks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, [trackId, curatorUsername]);

  const scrollToTrack = (index: number) => {
    if (containerRef.current) {
      const trackElement = containerRef.current.children[index] as HTMLElement;
      if (trackElement) {
        trackElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scrollPosition = container.scrollTop;
    const trackHeight = window.innerHeight;

    const newIndex = Math.round(scrollPosition / trackHeight);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < tracks.length) {
      setCurrentIndex(newIndex);
    }
  };

  const navigateTrack = (direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < tracks.length) {
      setCurrentIndex(newIndex);
      scrollToTrack(newIndex);
    }
  };

  const handleCoSign = async () => {
    const currentTrack = tracks[currentIndex];
    if (!currentTrack || !userContext) return;

    try {
      const response = await fetch(`/api/tracks/${currentTrack.id}/cosign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userFid: userContext.fid,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the local state with new count
        setTracks(prevTracks => {
          const newTracks = [...prevTracks];
          newTracks[currentIndex] = {
            ...newTracks[currentIndex],
            coSigns: data.coSignCount,
          };
          return newTracks;
        });
      } else {
        console.error('Co-sign failed:', data.error);
        alert(data.error || 'Failed to co-sign');
      }
    } catch (error) {
      console.error('Error co-signing:', error);
      alert('Failed to co-sign track');
    }
  };

  const handleTipSuccess = (amount: number) => {
    // Update the local state with new tip amount
    setTracks(prevTracks => {
      const newTracks = [...prevTracks];
      newTracks[currentIndex] = {
        ...newTracks[currentIndex],
        tips: (newTracks[currentIndex].tips || 0) + amount,
      };
      return newTracks;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECECEC]">
        <div className="text-[#2d4a3a]">Loading tracks...</div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECECEC]">
        <div className="text-center">
          <p className="text-[#2d4a3a]">No tracks found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#ECECEC]">
      {/* Scrollable Track Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className="min-h-screen w-full snap-start snap-always relative flex items-start justify-center pt-4 pb-24"
          >
            {/* Main Content Container */}
            <div className="max-w-2xl w-full px-4">
              {/* Track Card */}
              <div className="panel-surface overflow-hidden">
                {/* Curator Info - Top */}
                <div className="px-4 pt-4 pb-3">
                  <Link href={`/curator/${track.sharedBy.username}`}>
                    <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                      {track.sharedBy.pfpUrl ? (
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-[#ECECEC] flex-shrink-0">
                          <Image
                            src={track.sharedBy.pfpUrl}
                            alt={track.sharedBy.username}
                            width={36}
                            height={36}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F36C5B] to-[#B8E1C2] flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-xs">
                            {track.sharedBy.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#2E2E2E] lowercase">@{track.sharedBy.username}</p>
                      </div>
                      <div className="px-2.5 py-1 rounded-full bg-[#EFBF56]/30 flex items-center gap-1">
                        <span className="text-xs">⭐</span>
                        <span className="mono-number text-xs font-bold text-[#2E2E2E]">
                          {track.sharedBy.curatorScore || 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Embed Player */}
                {track.embedUrl && (
                  <div className="relative w-full">
                    {track.platform === 'soundcloud' ? (
                      <iframe
                        width="100%"
                        height="166"
                        scrolling="no"
                        frameBorder="no"
                        allow="autoplay"
                        src={track.embedUrl}
                        className="w-full"
                      />
                    ) : track.platform === 'spotify' ? (
                      <iframe
                        src={track.embedUrl}
                        width="100%"
                        height="352"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="w-full"
                      />
                    ) : (
                      <iframe
                        width="100%"
                        height="315"
                        src={track.embedUrl}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full"
                      />
                    )}
                  </div>
                )}

                {/* Track Info Section */}
                <div className="p-5">
                  {/* Track Title & Artist */}
                  <h1 className="text-sm font-bold text-[#2E2E2E] mb-0.5 lowercase" style={{ letterSpacing: '-0.01em' }}>
                    {track.title}
                  </h1>
                  <p className="text-xs text-[#5E5E5E] mb-3 lowercase">{track.artist}</p>

                  {/* Review Text */}
                  {track.review && (
                    <div className="p-3 bg-white/40 rounded-lg">
                      <p className="text-sm text-[#5E5E5E] italic lowercase">
                        &ldquo;{track.review}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Arrows Only */}
              <div className="mt-4">
                <div className="flex gap-3 justify-center">
                  {index > 0 && (
                    <button
                      onClick={() => navigateTrack('up')}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      style={{
                        background: '#F6F6F6',
                        boxShadow: '4px 4px 8px #d0d0d0, -4px -4px 8px #ffffff',
                      }}
                    >
                      <ChevronUp className="w-5 h-5 text-[#5E5E5E]" />
                    </button>
                  )}

                  {index < tracks.length - 1 && (
                    <button
                      onClick={() => navigateTrack('down')}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      style={{
                        background: '#F6F6F6',
                        boxShadow: '4px 4px 8px #d0d0d0, -4px -4px 8px #ffffff',
                      }}
                    >
                      <ChevronDown className="w-5 h-5 text-[#5E5E5E]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Notch - Above Navbar (iPhone style) */}
      <div className="fixed bottom-[5rem] left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <div
            className="flex items-center gap-2 px-6 py-2"
            style={{
              background: '#F6F6F6',
              borderRadius: '24px 24px 10px 10px',
              boxShadow: '6px 6px 16px #d0d0d0, -6px -6px 16px #ffffff',
            }}
          >
            {/* Co-sign Button */}
            <button
              onClick={handleCoSign}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
              style={{
                background: '#F6F6F6',
                boxShadow: '3px 3px 6px #d0d0d0, -3px -3px 6px #ffffff',
              }}
            >
              <Heart className="w-4 h-4 text-[#F36C5B]" />
              <span className="mono-number text-sm font-bold text-[#2E2E2E]">
                {tracks[currentIndex]?.coSigns || 0}
              </span>
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-[#ECECEC]"></div>

            {/* Tip Button - Wrapping TipButton component */}
            {tracks[currentIndex] && (
              <TipButton
                trackId={tracks[currentIndex].id}
                curatorFid={tracks[currentIndex].sharedBy.fid}
                curatorAddress={tracks[currentIndex].sharedBy.walletAddress || ''}
                curatorUsername={tracks[currentIndex].sharedBy.username}
                onTipSuccess={handleTipSuccess}
                totalTips={tracks[currentIndex].tips || 0}
                variant="compact"
              />
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-[#ECECEC]"></div>

            {/* Placeholder for future metric */}
            <button
              disabled
              className="flex items-center gap-2 px-3 py-1.5 rounded-full opacity-30 cursor-not-allowed"
              style={{
                background: '#F6F6F6',
                boxShadow: '3px 3px 6px #d0d0d0, -3px -3px 6px #ffffff',
              }}
            >
              <ChevronUp className="w-4 h-4 text-[#5E5E5E]" />
              <span className="mono-number text-sm font-bold text-[#2E2E2E]">
                0
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        userPfpUrl={userContext?.pfpUrl}
      />

      <style jsx global>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

export default function ListenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#ECECEC]">
        <div className="text-[#2d4a3a]">Loading...</div>
      </div>
    }>
      <ListenPageContent />
    </Suspense>
  );
}
