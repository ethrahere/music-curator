'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MusicTrack } from '@/types/music';
import MusicCard from '@/components/MusicCard';
import Player from '@/components/Player';
import { ArrowLeft, Music, Users, DollarSign, TrendingUp, Award, Folder } from 'lucide-react';
import Image from 'next/image';

interface UserStats {
  tracksShared: number;
  followers: number;
  tipsEarned: number;
  successRate: number;
}

interface CuratorData {
  username: string;
  fid: number;
  bio: string;
  pfpUrl?: string;
  stats: UserStats;
}

export default function CuratorPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [curator, setCurator] = useState<CuratorData | null>(null);
  const [userTracks, setUserTracks] = useState<MusicTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (username) {
      fetchCuratorData(username);
      fetchUserTracks(username);
    }
  }, [username]);

  const fetchCuratorData = async (username: string) => {
    try {
      const response = await fetch(`/api/users/${username}/stats`);
      const data = await response.json();
      if (data.success) {
        setCurator({
          username: username,
          fid: data.fid || 0,
          bio: data.bio || '',
          pfpUrl: data.pfpUrl,
          stats: data.stats,
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch curator data:', error);
      setLoading(false);
    }
  };

  const fetchUserTracks = async (username: string) => {
    try {
      const response = await fetch(`/api/users/${username}/tracks`);
      const data = await response.json();
      if (data.success) {
        setUserTracks(data.tracks || []);
      }
    } catch (error) {
      console.error('Failed to fetch user tracks:', error);
    }
  };

  const handleTip = async () => {
    // Tip functionality handled in player
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#2d4a3a]">Loading curator profile...</div>
      </div>
    );
  }

  if (!curator) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Curator Not Found</h1>
          <p className="text-[#2d4a3a] mb-4">This curator doesn&apos;t exist or hasn&apos;t shared any tracks yet.</p>
          <button
            onClick={() => router.push('/')}
            className="btn-pastel"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="panel-surface px-4 py-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex-shrink-0 hover:opacity-80 transition-opacity"
              >
                <ArrowLeft className="w-6 h-6 text-[#0b1a12]" />
              </button>
              <h1 className="text-lg font-bold text-[#0b1a12]">@{curator.username}&apos;s Profile</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {/* User Info Card */}
        <div className="panel-surface p-6">
          <div className="flex items-start gap-4 mb-6">
            {/* Profile Picture */}
            {curator.pfpUrl ? (
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#a8e6c5] flex-shrink-0">
                <Image
                  src={curator.pfpUrl}
                  alt={curator.username}
                  width={80}
                  height={80}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] flex items-center justify-center flex-shrink-0">
                <span className="text-3xl font-bold text-[#0b1a12]">
                  {curator.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Username */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-[#0b1a12] mb-1">
                @{curator.username}
              </h2>
              <p className="text-sm text-[#2d4a3a]">FID: {curator.fid}</p>
            </div>
          </div>

          {/* Bio Section */}
          {curator.bio && (
            <div className="mb-6">
              <label className="text-sm font-semibold text-[#0b1a12] mb-2 block">Bio</label>
              <p className="text-sm text-[#2d4a3a] whitespace-pre-wrap">
                {curator.bio}
              </p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/40 rounded-xl p-4 text-center">
              <Music className="w-5 h-5 text-[#7fd4a8] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#0b1a12]">{curator.stats.tracksShared}</div>
              <div className="text-xs text-[#2d4a3a]">Tracks Shared</div>
            </div>

            <div className="bg-white/40 rounded-xl p-4 text-center">
              <Users className="w-5 h-5 text-[#7fd4a8] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#0b1a12]">{curator.stats.followers}</div>
              <div className="text-xs text-[#2d4a3a]">Followers</div>
            </div>

            <div className="bg-white/40 rounded-xl p-4 text-center">
              <DollarSign className="w-5 h-5 text-[#7fd4a8] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#0b1a12]">${curator.stats.tipsEarned.toFixed(2)}</div>
              <div className="text-xs text-[#2d4a3a]">USDC Earned</div>
            </div>

            <div className="bg-white/40 rounded-xl p-4 text-center">
              <TrendingUp className="w-5 h-5 text-[#7fd4a8] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#0b1a12]">{curator.stats.successRate}%</div>
              <div className="text-xs text-[#2d4a3a]">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Badges Section */}
        <div className="panel-surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-[#7fd4a8]" />
            <h3 className="text-lg font-bold text-[#0b1a12]">Badges</h3>
            <span className="px-3 py-1 rounded-full bg-white/40 text-[#2d4a3a] text-xs font-semibold">
              Coming Soon
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Placeholder badges - will be dynamic later */}
            <div className="px-4 py-2 rounded-full bg-white/40 text-[#2d4a3a] text-sm font-semibold opacity-50 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Early Curator
            </div>
            <div className="px-4 py-2 rounded-full bg-white/40 text-[#2d4a3a] text-sm font-semibold opacity-50">
              🎵 First Share
            </div>
            <div className="px-4 py-2 rounded-full bg-white/40 text-[#2d4a3a] text-sm font-semibold opacity-50">
              💰 First Tip
            </div>
          </div>
        </div>

        {/* Tracks Section */}
        <div className="panel-surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <Folder className="w-5 h-5 text-[#7fd4a8]" />
            <h3 className="text-lg font-bold text-[#0b1a12]">Tracks</h3>
          </div>

          {/* All Tracks Playlist */}
          <button
            onClick={() => setShowAllTracks(!showAllTracks)}
            className="w-full bg-white/40 hover:bg-white/60 rounded-xl p-4 transition-all mb-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] flex items-center justify-center">
                  <Music className="w-6 h-6 text-[#0b1a12]" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-[#0b1a12]">All Tracks</div>
                  <div className="text-xs text-[#2d4a3a]">{userTracks.length} tracks</div>
                </div>
              </div>
              <ArrowLeft className={`w-5 h-5 text-[#2d4a3a] transition-transform ${showAllTracks ? '-rotate-90' : 'rotate-180'}`} />
            </div>
          </button>

          {/* Tracks Grid */}
          {showAllTracks && userTracks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {userTracks.map((track) => (
                <MusicCard
                  key={track.id}
                  track={track}
                  onPlay={setSelectedTrack}
                  onTip={handleTip}
                />
              ))}
            </div>
          )}

          {showAllTracks && userTracks.length === 0 && (
            <div className="text-center py-8 text-[#2d4a3a] text-sm">
              No tracks shared yet
            </div>
          )}
        </div>
      </main>

      {/* Player Modal */}
      {selectedTrack && (
        <Player
          track={selectedTrack}
          onClose={() => setSelectedTrack(null)}
          onTip={handleTip}
          baseUrl={typeof window !== 'undefined' ? window.location.origin : ''}
          playlist={userTracks}
          currentIndex={userTracks.findIndex(t => t.id === selectedTrack.id)}
          onPlayNext={setSelectedTrack}
        />
      )}
    </div>
  );
}
