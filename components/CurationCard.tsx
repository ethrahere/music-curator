'use client';

import { MusicTrack } from '@/types/music';
import { Play, Heart, DollarSign } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface CurationCardProps {
  track: MusicTrack;
  onPlay: (track: MusicTrack) => void;
  onCosign?: (trackId: string) => void;
  onTip?: (trackId: string) => void;
}

export default function CurationCard({ track, onPlay }: CurationCardProps) {
  return (
    <div className="panel-surface overflow-hidden">
      {/* Curator Header */}
      <Link href={`/curator/${track.sharedBy.username}`} className="block">
        <div className="p-4 hover:bg-[#FAFAFA] transition-colors">
          <div className="flex items-center gap-3">
            {/* Curator Avatar */}
            {track.sharedBy.pfpUrl ? (
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#ECECEC] flex-shrink-0">
                <Image
                  src={track.sharedBy.pfpUrl}
                  alt={track.sharedBy.username}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F36C5B] to-[#B8E1C2] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">
                  {track.sharedBy.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Curator Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#2E2E2E] text-sm lowercase truncate">
                @{track.sharedBy.username}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5E5E5E] lowercase">curator</span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFBF56]/20">
                  <span className="text-xs">⭐</span>
                  <span className="mono-number text-xs font-bold text-[#2E2E2E]">
                    {track.sharedBy.curatorScore || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Curator's Review/Note */}
          {track.review && (
            <div className="mt-3">
              <p className="text-sm text-[#2E2E2E] italic lowercase line-clamp-3">
                &ldquo;{track.review}&rdquo;
              </p>
            </div>
          )}
        </div>
      </Link>

      {/* Track Info with Play Button */}
      <div className="relative">
        <div
          className="relative aspect-[16/9] cursor-pointer group"
          onClick={() => onPlay(track)}
        >
          {/* Artwork */}
          <Image
            src={track.artwork}
            alt={track.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />

          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-120" />

          {/* Circular Play Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-120">
            <button
              className="btn-circular w-16 h-16"
              onClick={(e) => {
                e.stopPropagation();
                onPlay(track);
              }}
            >
              <Play className="w-7 h-7 text-[#F36C5B] ml-1" fill="currentColor" />
            </button>
          </div>
        </div>

        {/* Track Details Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-4 pt-8">
          <h3 className="font-bold text-white text-lg mb-0.5 lowercase truncate">
            {track.title}
          </h3>
          <p className="text-sm text-white/80 lowercase truncate">{track.artist}</p>
        </div>
      </div>

      {/* Engagement Bar */}
      <div className="p-3 bg-[#F6F6F6] flex items-center justify-between gap-2">
        {/* Engagement Stats */}
        <div className="flex items-center gap-3 text-xs text-[#5E5E5E] flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span className="mono-number">{track.coSigns || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            <span className="mono-number">${(track.tips || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Quick Action: Play */}
        <button
          onClick={() => onPlay(track)}
          className="px-4 py-2 rounded-full bg-gradient-to-br from-[#B8E1C2] to-[#a8d4b2] hover:scale-105 transition-transform flex items-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5 text-[#0b1a12]" fill="currentColor" />
          <span className="text-xs font-bold text-[#0b1a12] lowercase">play</span>
        </button>
      </div>
    </div>
  );
}
