'use client';

import { MusicTrack } from '@/types/music';
import { Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface MusicCardProps {
  track: MusicTrack;
  onPlay: (track: MusicTrack) => void;
  onTip?: (trackId: string) => void;
  isPlaying?: boolean;
}

export default function MusicCard({ track, onPlay, onTip, isPlaying = false }: MusicCardProps) {
  return (
    <div className="panel-surface card-tactile overflow-hidden cursor-pointer group relative">
      {/* LED Playing Indicator */}
      {isPlaying && (
        <div className="absolute top-4 right-4 z-10 led-dot"></div>
      )}

      {/* Artwork with rounded bezel shadow */}
      <div className="aspect-[3/2] relative" onClick={() => onPlay(track)}>
        <div className="absolute inset-0 rounded-t-[18px] overflow-hidden">
          <Image
            src={track.artwork}
            alt={track.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-120" />
        </div>

        {/* Circular Play Pad - Skeuomorphic */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-120">
          <button
            className="btn-circular w-20 h-20"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(track);
            }}
          >
            <Play className="w-8 h-8 text-[#F36C5B] ml-1" fill="currentColor" />
          </button>
        </div>
      </div>

      {/* Track Info - Device Panel Style */}
      <div className="p-5 bg-[#F6F6F6]">
        {/* Title & Artist */}
        <div className="mb-3">
          <h3 className="font-semibold text-[#2E2E2E] text-base truncate mb-0.5 lowercase">
            {track.title}
          </h3>
          <p className="text-sm text-[#5E5E5E] truncate lowercase">{track.artist}</p>
        </div>

        {/* Bottom Row: Platform Tag, Curator, Tips */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="pill-tag text-[0.65rem] flex-shrink-0">
              {track.platform}
            </span>
            <Link
              href={`/curator/${track.sharedBy.username}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-[#5E5E5E] hover:text-[#2E2E2E] transition-colors truncate lowercase"
            >
              @{track.sharedBy.username}
            </Link>
          </div>

          {/* Tip Counter - LED Style */}
          {onTip && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ECECEC] flex-shrink-0">
              <span className="mono-number text-[0.7rem] text-[#EFBF56]">
                ${track.tips || 0}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
