'use client';

import { MusicTrack } from '@/types/music';
import { Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MusicCardProps {
  track: MusicTrack;
  onPlay: (track: MusicTrack) => void;
  onTip?: (trackId: string) => void;
  isPlaying?: boolean;
}

export default function MusicCard({ track, onPlay, onTip, isPlaying = false }: MusicCardProps) {
  const router = useRouter();

  const handlePlay = () => {
    // Navigate to listen page with track ID and curator username
    router.push(`/listen?track=${track.id}&curator=${track.sharedBy.username}`);
  };

  return (
    <div className="panel-surface card-tactile overflow-hidden cursor-pointer group relative" onClick={handlePlay}>
      {/* LED Playing Indicator */}
      {isPlaying && (
        <div className="absolute top-4 right-4 z-10 led-dot"></div>
      )}

      {/* Artwork with rounded bezel shadow */}
      <div className="aspect-[3/2] relative">
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
              handlePlay();
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

        {/* Bottom Row: Curator PFP + Username, Tips */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/curator/${track.sharedBy.username}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            {track.sharedBy.pfpUrl ? (
              <div className="w-6 h-6 rounded-full overflow-hidden border border-[#ECECEC] flex-shrink-0">
                <Image
                  src={track.sharedBy.pfpUrl}
                  alt={track.sharedBy.username}
                  width={24}
                  height={24}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#F36C5B] to-[#B8E1C2] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-[0.6rem]">
                  {track.sharedBy.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-xs text-[#5E5E5E] truncate lowercase">
              @{track.sharedBy.username}
            </span>
          </Link>

          {/* Tip Counter - LED Style */}
          {onTip && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ECECEC] flex-shrink-0">
              <span className="mono-number text-[0.7rem] text-[#EFBF56]">
                ${(track.tips || 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
