'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Curator {
  fid: number;
  username: string;
  pfpUrl?: string;
  curatorScore: number;
  trackCount: number;
}

export default function TopCurators() {
  const [curators, setCurators] = useState<Curator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopCurators() {
      try {
        console.log('[TopCurators] Fetching top curators...');
        const response = await fetch('/api/curators/top?limit=6');
        console.log('[TopCurators] Response status:', response.status);

        if (!response.ok) {
          console.error('[TopCurators] Bad response:', response.status, response.statusText);
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log('[TopCurators] Data received:', data);

        if (data.success) {
          setCurators(data.curators || []);
        }
      } catch (error) {
        console.error('[TopCurators] Error fetching top curators:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTopCurators();
  }, []);

  if (loading) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[#2E2E2E] mb-3 lowercase px-4">
          top curators
        </h2>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 hide-scrollbar">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="panel-surface flex-shrink-0 w-32 p-3 animate-pulse"
            >
              <div className="w-16 h-16 rounded-full bg-[#ECECEC] mx-auto mb-2" />
              <div className="h-3 bg-[#ECECEC] rounded mb-1" />
              <div className="h-4 bg-[#ECECEC] rounded w-12 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (curators.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-[#2E2E2E] mb-3 lowercase px-4">
        top curators
      </h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 hide-scrollbar">
        {curators.map((curator) => (
          <Link
            key={curator.fid}
            href={`/curator/${curator.username}`}
            className="panel-surface flex-shrink-0 w-32 p-3 hover:scale-105 transition-transform"
          >
            {/* Curator Avatar */}
            <div className="mb-2">
              {curator.pfpUrl ? (
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#ECECEC] mx-auto">
                  <Image
                    src={curator.pfpUrl}
                    alt={curator.username}
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F36C5B] to-[#B8E1C2] flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-xl">
                    {curator.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Username */}
            <p className="text-xs font-semibold text-[#2E2E2E] text-center lowercase truncate mb-1">
              @{curator.username}
            </p>

            {/* Score Badge */}
            <div className="flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-[#EFBF56]/20">
              <span className="text-xs">⭐</span>
              <span className="mono-number text-xs font-bold text-[#2E2E2E]">
                {curator.curatorScore}
              </span>
            </div>

            {/* Track Count */}
            <p className="text-[10px] text-[#5E5E5E] text-center mt-1 lowercase">
              {curator.trackCount} {curator.trackCount === 1 ? 'track' : 'tracks'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
