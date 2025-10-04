'use client';

import { MusicTrack } from '@/types/music';
import { Heart, Share2, X } from 'lucide-react';
import Image from 'next/image';
import { shareToFarcaster } from '@/lib/farcaster';
import { useState } from 'react';

interface PlayerProps {
  track: MusicTrack;
  onClose: () => void;
  onTip: (trackId: string) => void;
  baseUrl: string;
}

export default function Player({ track, onClose, onTip, baseUrl }: PlayerProps) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    const trackUrl = `${baseUrl}/track/${track.id}`;
    await shareToFarcaster(
      trackUrl,
      `🎵 Check out "${track.title}" by ${track.artist}`
    );
    setSharing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 relative rounded-lg overflow-hidden">
            <Image src={track.artwork} alt={track.title} fill className="object-cover" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">{track.title}</h2>
            <p className="text-xs text-white/60">{track.artist}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Player Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto">
        {/* Artwork */}
        <div className="w-full max-w-md aspect-square relative rounded-2xl overflow-hidden shadow-2xl mb-8">
          <Image
            src={track.artwork}
            alt={track.title}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Track Info */}
        <div className="text-center mb-8 max-w-md">
          <h1 className="text-2xl font-bold text-white mb-2">{track.title}</h1>
          <p className="text-lg text-white/70 mb-4">{track.artist}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-white/50">
            <span>Shared by {track.sharedBy.username}</span>
            <span>•</span>
            <span className="capitalize">{track.platform}</span>
          </div>
        </div>

        {/* Embedded Player */}
        {track.embedUrl && (
          <div className="w-full max-w-2xl mb-8">
            <div className="relative w-full rounded-xl overflow-hidden shadow-2xl border border-white/10">
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
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onTip(track.id)}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold transition-all shadow-lg shadow-pink-500/25"
          >
            <Heart className="w-5 h-5" />
            <span>Tip</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-sm">
              {track.tips}
            </span>
          </button>

          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold transition-all disabled:opacity-50"
          >
            <Share2 className="w-5 h-5" />
            <span>{sharing ? 'Sharing...' : 'Share'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
