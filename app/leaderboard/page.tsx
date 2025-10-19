'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Star, Trophy } from 'lucide-react';
import Image from 'next/image';
import BottomNav from '@/components/BottomNav';
import { getUserContext, initializeFarcaster } from '@/lib/farcaster';

interface LeaderboardEntry {
  farcaster_fid: number;
  username: string;
  pfp_url?: string;
  xp?: number;
  curator_score?: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [xpLeaderboard, setXpLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [curatorScoreLeaderboard, setCuratorScoreLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userContext, setUserContext] = useState<{ fid: number; username: string; pfpUrl?: string } | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'xp' | 'curator_score'>('xp');

  useEffect(() => {
    const init = async () => {
      await initializeFarcaster();
      const user = await getUserContext();
      setUserContext(user);
    };
    init();

    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      if (data.success) {
        setXpLeaderboard(data.xpLeaderboard || []);
        setCuratorScoreLeaderboard(data.curatorScoreLeaderboard || []);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderLeaderboardEntry = (
    entry: LeaderboardEntry,
    rank: number,
    scoreType: 'xp' | 'curator_score'
  ) => {
    const score = scoreType === 'xp' ? entry.xp || 0 : entry.curator_score || 0;
    const isTopThree = rank <= 3;

    return (
      <div
        key={entry.farcaster_fid}
        className={`
          flex items-center gap-4 p-4 rounded-xl transition-all
          ${isTopThree ? 'bg-gradient-to-br from-white/60 to-white/40' : 'bg-white/40'}
          ${rank === 1 ? 'border-2 border-[#EFBF56]' : ''}
        `}
      >
        {/* Rank */}
        <div className="flex-shrink-0 w-10 text-center">
          {rank === 1 && <Trophy className="w-6 h-6 text-[#EFBF56] mx-auto" />}
          {rank === 2 && <Trophy className="w-6 h-6 text-[#C0C0C0] mx-auto" />}
          {rank === 3 && <Trophy className="w-6 h-6 text-[#CD7F32] mx-auto" />}
          {rank > 3 && <span className="text-lg font-bold text-[#2d4a3a]">{rank}</span>}
        </div>

        {/* Profile Picture */}
        {entry.pfp_url ? (
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#a8e6c5] flex-shrink-0">
            <Image
              src={entry.pfp_url}
              alt={entry.username}
              width={48}
              height={48}
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-[#0b1a12]">
              {entry.username[0]?.toUpperCase() || '?'}
            </span>
          </div>
        )}

        {/* Username */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0b1a12] truncate">
            @{entry.username}
          </p>
        </div>

        {/* Score */}
        <div className="flex-shrink-0 text-right">
          <div className="text-xl font-bold text-[#0b1a12] mono-number">
            {score.toLocaleString()}
          </div>
          <div className="text-xs text-[#2d4a3a]">
            {scoreType === 'xp' ? 'XP' : 'score'}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#2d4a3a]">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="panel-surface px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/')}
                  className="flex-shrink-0 hover:opacity-80 transition-opacity"
                >
                  <ArrowLeft className="w-6 h-6 text-[#0b1a12]" />
                </button>
                <h1 className="text-lg font-bold text-[#0b1a12]">Leaderboard</h1>
              </div>
              <Trophy className="w-6 h-6 text-[#EFBF56]" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-4 space-y-6">
        {/* Filter Pills */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedFilter('xp')}
            className={`px-5 py-2 rounded-full font-semibold text-sm transition-all ${
              selectedFilter === 'xp'
                ? 'bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] text-[#0b1a12] shadow-lg'
                : 'bg-white/40 text-[#2d4a3a] hover:bg-white/60'
            }`}
          >
            XP Leaderboard
          </button>
          <button
            onClick={() => setSelectedFilter('curator_score')}
            className={`px-5 py-2 rounded-full font-semibold text-sm transition-all ${
              selectedFilter === 'curator_score'
                ? 'bg-gradient-to-br from-[#EFBF56] to-[#F36C5B] text-white shadow-lg'
                : 'bg-white/40 text-[#2d4a3a] hover:bg-white/60'
            }`}
          >
            Curator Score
          </button>
        </div>

        {/* Leaderboard Display */}
        <div className="panel-surface p-6">
          <div className="flex items-center gap-3 mb-6">
            {selectedFilter === 'xp' ? (
              <>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#0b1a12]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0b1a12]">XP Leaderboard</h2>
                  <p className="text-xs text-[#2d4a3a]">Top curators by experience points</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EFBF56] to-[#F36C5B] flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0b1a12]">Curator Score Leaderboard</h2>
                  <p className="text-xs text-[#2d4a3a]">Top curators by reputation</p>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            {selectedFilter === 'xp' ? (
              xpLeaderboard.length > 0 ? (
                xpLeaderboard.map((entry, index) =>
                  renderLeaderboardEntry(entry, index + 1, 'xp')
                )
              ) : (
                <div className="text-center py-8 text-[#2d4a3a] text-sm">
                  No curators yet. Be the first!
                </div>
              )
            ) : (
              curatorScoreLeaderboard.length > 0 ? (
                curatorScoreLeaderboard.map((entry, index) =>
                  renderLeaderboardEntry(entry, index + 1, 'curator_score')
                )
              ) : (
                <div className="text-center py-8 text-[#2d4a3a] text-sm">
                  No curators yet. Be the first!
                </div>
              )
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        userPfpUrl={userContext?.pfpUrl}
        onShareClick={() => router.push('/')}
      />
    </div>
  );
}
