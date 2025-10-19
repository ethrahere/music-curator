'use client';

import { useRouter, usePathname } from 'next/navigation';
import { User, Plus, Trophy, Home, Music } from 'lucide-react';
import Image from 'next/image';

interface BottomNavProps {
  userPfpUrl?: string;
  onShareClick: () => void;
}

export default function BottomNav({ userPfpUrl, onShareClick }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#f5f5f5]/95 backdrop-blur-sm border-t border-[#ECECEC]">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex items-center justify-around py-2">
          {/* Home Feed Button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center transition-all hover:scale-105"
          >
            <div className={`
              w-9 h-9 rounded-full flex items-center justify-center transition-colors
              ${isActive('/')
                ? 'bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8]'
                : 'bg-[#ECECEC]'
              }
            `}>
              <Home className={`
                w-5 h-5
                ${isActive('/') ? 'text-[#0b1a12]' : 'text-[#5E5E5E]'}
              `} />
            </div>
          </button>

          {/* Listen/Reels Button */}
          <button
            onClick={() => router.push('/listen')}
            className="flex items-center justify-center transition-all hover:scale-105"
          >
            <div className={`
              w-9 h-9 rounded-full flex items-center justify-center transition-colors
              ${isActive('/listen')
                ? 'bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8]'
                : 'bg-[#ECECEC]'
              }
            `}>
              <Music className={`
                w-5 h-5
                ${isActive('/listen') ? 'text-[#0b1a12]' : 'text-[#5E5E5E]'}
              `} />
            </div>
          </button>

          {/* Share Button - Center */}
          <button
            onClick={onShareClick}
            className="flex items-center justify-center transition-all hover:scale-105"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] flex items-center justify-center shadow-lg">
              <Plus className="w-6 h-6 text-[#0b1a12]" />
            </div>
          </button>

          {/* Leaderboard Button */}
          <button
            onClick={() => router.push('/leaderboard')}
            className="flex items-center justify-center transition-all hover:scale-105"
          >
            <div className={`
              w-9 h-9 rounded-full flex items-center justify-center transition-colors
              ${isActive('/leaderboard')
                ? 'bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8]'
                : 'bg-[#ECECEC]'
              }
            `}>
              <Trophy className={`
                w-5 h-5
                ${isActive('/leaderboard') ? 'text-[#0b1a12]' : 'text-[#5E5E5E]'}
              `} />
            </div>
          </button>

          {/* Profile Button */}
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center justify-center transition-all hover:scale-105"
          >
            {userPfpUrl ? (
              <div className={`
                w-9 h-9 rounded-full overflow-hidden border-2 transition-colors
                ${isActive('/profile') ? 'border-[#a8e6c5]' : 'border-transparent'}
              `}>
                <Image
                  src={userPfpUrl}
                  alt="Profile"
                  width={36}
                  height={36}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center transition-colors
                ${isActive('/profile')
                  ? 'bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8]'
                  : 'bg-[#ECECEC]'
                }
              `}>
                <User className={`
                  w-5 h-5
                  ${isActive('/profile') ? 'text-[#0b1a12]' : 'text-[#5E5E5E]'}
                `} />
              </div>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
