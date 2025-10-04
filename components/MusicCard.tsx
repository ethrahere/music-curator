'use client';

import { MusicTrack } from '@/types/music';
import { Play, Heart } from 'lucide-react';
import Image from 'next/image';

interface MusicCardProps {
  track: MusicTrack;
  onPlay: (track: MusicTrack) => void;
  onTip?: (trackId: string) => void;
}

export default function MusicCard({ track, onPlay, onTip }: MusicCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg backdrop-blur-md bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer">
      <div className="aspect-[3/2] relative" onClick={() => onPlay(track)}>
        <Image
          src={track.artwork}
          alt={track.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
            <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Track info */}
      <div className="p-4">
        <h3 className="font-semibold text-white truncate mb-1">{track.title}</h3>
        <p className="text-sm text-white/60 truncate mb-3">{track.artist}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span>by {track.sharedBy.username}</span>
            <span className="capitalize text-white/30">• {track.platform}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onTip?.(track.id);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-xs text-white font-medium">{track.tips}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
