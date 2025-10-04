'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MusicTrack } from '@/types/music';
import Player from '@/components/Player';

function PlayPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const trackId = searchParams.get('trackId');
  const [track, setTrack] = useState<MusicTrack | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    try {
      const response = await fetch(`/api/tracks/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tip' }),
      });
      const data = await response.json();
      if (data.success && data.track) {
        setTrack(data.track);
      }
    } catch (error) {
      console.error('Failed to tip track:', error);
    }
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
