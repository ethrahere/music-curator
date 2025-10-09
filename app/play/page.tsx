'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MusicTrack } from '@/types/music';
import Player from '@/components/Player';
import { initializeFarcaster } from '@/lib/farcaster';

function PlayPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const trackId = searchParams.get('trackId');
  const [track, setTrack] = useState<MusicTrack | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Farcaster SDK to hide splash screen
    initializeFarcaster();

    if (trackId) {
      fetchTrack(trackId);
    }
  }, [trackId]);

  const fetchTrack = async (id: string) => {
    try {
      const response = await fetch(`/api/tracks/${id}`);
      const data = await response.json();
      setTrack(data.track || null);
    } catch (error) {
      console.error('Failed to fetch track:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTip = async (id: string) => {
    // Player component manages its own tip state, no need to update here
    // This prevents unnecessary re-renders
  };

  const handleClose = () => {
    router.push('/feed');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white/60">Loading player...</div>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white/60">Track not found</div>
      </div>
    );
  }

  return (
    <Player
      track={track}
      onClose={handleClose}
      onTip={handleTip}
      baseUrl={typeof window !== 'undefined' ? window.location.origin : ''}
    />
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    }>
      <PlayPageContent />
    </Suspense>
  );
}
