'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserContext, initializeFarcaster } from '@/lib/farcaster';
import { MusicTrack } from '@/types/music';
import MusicCard from '@/components/MusicCard';
import Player from '@/components/Player';
import { ArrowLeft, User, Edit3, Music, Users, DollarSign, TrendingUp, Award, Folder, Share2, Sparkles, Star } from 'lucide-react';
import Image from 'next/image';
import BottomNav from '@/components/BottomNav';

interface UserStats {
  tracksShared: number;
  followers: number;
  tipsEarned: number;
  successRate: number;
  xp: number;
  curatorScore: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [userContext, setUserContext] = useState<{ fid: number; username: string; pfpUrl?: string } | null>(null);
  const [bio, setBio] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    tracksShared: 0,
    followers: 0,
    tipsEarned: 0,
    successRate: 0,
    xp: 0,
    curatorScore: 0,
  });
  const [userTracks, setUserTracks] = useState<MusicTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [showAllTracks, setShowAllTracks] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initializeFarcaster();
      const user = await getUserContext();
      setUserContext(user);

      // Fetch user stats and tracks
      if (user.username !== 'anonymous') {
        fetchUserStats(user.username);
        fetchUserTracks(user.username);
      }
    };
    init();
  }, []);

  const fetchUserStats = async (username: string) => {
    try {
      const response = await fetch(`/api/users/${username}/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setBio(data.bio || '');
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
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

  const handleSaveBio = async () => {
    if (!userContext) return;

    try {
      await fetch(`/api/users/${userContext.username}/bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      });
      setIsEditingBio(false);
    } catch (error) {
      console.error('Failed to save bio:', error);
    }
  };

  const handleShareProfile = async () => {
    if (!userContext) return;

    const baseUrl = window.location.origin;
    const profileCardUrl = `${baseUrl}/api/profile-card?username=${encodeURIComponent(userContext.username)}&pfpUrl=${encodeURIComponent(userContext.pfpUrl || '')}&tracksShared=${stats.tracksShared}&tipsEarned=${stats.tipsEarned}&successRate=${stats.successRate}&bio=${encodeURIComponent(bio)}`;

    const castText = `Check out my curator profile on Curio! 🎵\n\n${stats.tracksShared} tracks shared • $${stats.tipsEarned} earned • ${stats.successRate}% success rate`;

    try {
      const { shareToFarcaster } = await import('@/lib/farcaster');
      await shareToFarcaster(profileCardUrl, castText);
    } catch (error) {
      console.error('Failed to share profile:', error);
    }
  };

  const handleTip = async () => {
    // Tip functionality handled in player
  };

  if (!userContext) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#2d4a3a]">Loading profile...</div>
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
              <h1 className="text-lg font-bold text-[#0b1a12]">Profile</h1>
              <User className="w-6 h-6 text-[#a8e6c5]" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-6">
        {/* User Info Card */}
        <div className="panel-surface p-6">
          <div className="flex items-start gap-4 mb-6">
            {/* Profile Picture */}
            {userContext.pfpUrl ? (
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#a8e6c5] flex-shrink-0">
                <Image
                  src={userContext.pfpUrl}
                  alt={userContext.username}
                  width={80}
                  height={80}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] flex items-center justify-center flex-shrink-0">
                <User className="w-10 h-10 text-[#0b1a12]" />
              </div>
            )}

            {/* Username */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-[#0b1a12] mb-1">
                @{userContext.username}
              </h2>
              <p className="text-sm text-[#2d4a3a]">FID: {userContext.fid}</p>
            </div>
          </div>

          {/* Bio Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-[#0b1a12]">Bio</label>
              {!isEditingBio ? (
                <button
                  onClick={() => setIsEditingBio(true)}
                  className="flex items-center gap-1 text-xs text-[#2d4a3a] hover:text-[#0b1a12] transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              ) : (
                <button
                  onClick={handleSaveBio}
                  className="text-xs font-semibold text-[#7fd4a8] hover:text-[#a8e6c5] transition-colors"
                >
                  Save
                </button>
              )}
            </div>
            {isEditingBio ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about your music taste..."
                rows={3}
                maxLength={200}
                className="input-shell w-full resize-none text-sm"
              />
            ) : (
              <p className="text-sm text-[#2d4a3a] whitespace-pre-wrap">
                {bio || 'No bio yet. Click edit to add one!'}
              </p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* XP Card */}
            <div className="bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] rounded-xl p-4 text-center">
              <Sparkles className="w-5 h-5 text-[#0b1a12] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#0b1a12] mono-number">{stats.xp.toLocaleString()}</div>
              <div className="text-xs text-[#0b1a12] font-semibold lowercase">total xp</div>
            </div>

            {/* Curator Score Card */}
            <div className="bg-gradient-to-br from-[#EFBF56] to-[#F36C5B] rounded-xl p-4 text-center">
              <Star className="w-5 h-5 text-white mx-auto mb-2" />
              <div className="text-2xl font-bold text-white mono-number">{stats.curatorScore.toLocaleString()}</div>
              <div className="text-xs text-white font-semibold lowercase">curator score</div>
            </div>

            {/* Tips Earned */}
            <div className="bg-white/40 rounded-xl p-4 text-center">
              <DollarSign className="w-5 h-5 text-[#7fd4a8] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#0b1a12]">${stats.tipsEarned}</div>
              <div className="text-xs text-[#2d4a3a] lowercase">tips earned</div>
            </div>

            {/* Tracks Shared */}
            <div className="bg-white/40 rounded-xl p-4 text-center">
              <Music className="w-5 h-5 text-[#7fd4a8] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#0b1a12]">{stats.tracksShared}</div>
              <div className="text-xs text-[#2d4a3a] lowercase">tracks shared</div>
            </div>

            {/* Followers */}
            <div className="bg-white/40 rounded-xl p-4 text-center">
              <Users className="w-5 h-5 text-[#7fd4a8] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#0b1a12]">{stats.followers}</div>
              <div className="text-xs text-[#2d4a3a] lowercase">followers</div>
            </div>
          </div>

          {/* Share Profile Button */}
          <button
            onClick={handleShareProfile}
            className="mt-6 w-full py-3 bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] text-[#0b1a12] font-semibold rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg"
          >
            <Share2 className="w-5 h-5" />
            Share Profile
          </button>
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

        {/* Playlists Section */}
        <div className="panel-surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <Folder className="w-5 h-5 text-[#7fd4a8]" />
            <h3 className="text-lg font-bold text-[#0b1a12]">Playlists</h3>
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

      {/* Bottom Navigation */}
      <BottomNav
        userPfpUrl={userContext?.pfpUrl}
      />
    </div>
  );
}
