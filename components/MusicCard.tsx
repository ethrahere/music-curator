'use client';

import { MusicTrack } from '@/types/music';
import { Play, Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface MusicCardProps {
  track: MusicTrack;
  onPlay: (track: MusicTrack) => void;
  onTip?: (trackId: string) => void;
}

export default function MusicCard({ track, onPlay, onTip }: MusicCardProps) {
  return (
    <div className="panel-surface overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group">
      {/* Artwork */}
      <div className="aspect-[3/2] relative" onClick={() => onPlay(track)}>
        <Image
          src={track.artwork}
          alt={track.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1a12]/90 via-[#0b1a12]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
            <Play className="w-8 h-8 text-[#0b1a12] ml-1" fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Track info */}
      <div className="p-5">
        <h3 className="font-semibold text-[#0b1a12] text-base truncate mb-1">{track.title}</h3>
        <p className="text-sm text-[#2d4a3a] truncate mb-3">{track.artist}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="pill-tag text-[0.65rem]">
              {track.platform}
            </span>
            <Link
              href={`/curator/${track.sharedBy.username}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-[#2d4a3a] hover:text-[#0b1a12] hover:underline transition-colors"
            >
              @{track.sharedBy.username}
            </Link>
          </div>

          {onTip && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTip(track.id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/50 hover:bg-white/70 border border-[#2d4a3a]/20 transition-all hover:scale-105"
            >
              <Heart className="w-3.5 h-3.5 text-[#7fd4a8]" />
              <span className="text-xs text-[#0b1a12] font-semibold">
                ${track.tips || 0}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
