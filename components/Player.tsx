'use client';

import { MusicTrack } from '@/types/music';
import { Share2, X, DollarSign, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { shareToFarcaster, sendTip, getUserContext } from '@/lib/farcaster';
import { useState } from 'react';

interface PlayerProps {
  track: MusicTrack;
  onClose: () => void;
  onTip: (trackId: string) => void;
  baseUrl: string;
  playlist?: MusicTrack[];
  currentIndex?: number;
  onPlayNext?: (nextTrack: MusicTrack) => void;
}

export default function Player({ track, onClose, onTip, baseUrl, playlist, currentIndex, onPlayNext }: PlayerProps) {
  const [sharing, setSharing] = useState(false);
  const [tipping, setTipping] = useState(false);
  const [showTipAmounts, setShowTipAmounts] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [tipSuccess, setTipSuccess] = useState(false);

  const tipAmounts = [1, 5, 10];

  // Check if there's a next track
  const hasNextTrack = playlist && currentIndex !== undefined && currentIndex < playlist.length - 1;
  const hasPrevTrack = playlist && currentIndex !== undefined && currentIndex > 0;

  const handlePlayNext = () => {
    if (hasNextTrack && playlist && currentIndex !== undefined && onPlayNext) {
      const nextTrack = playlist[currentIndex + 1];
      onPlayNext(nextTrack);
    }
  };

  const handlePlayPrev = () => {
    if (hasPrevTrack && playlist && currentIndex !== undefined && onPlayNext) {
      const prevTrack = playlist[currentIndex - 1];
      onPlayNext(prevTrack);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    const trackUrl = `${baseUrl}/track/${track.id}`;
    await shareToFarcaster(
      trackUrl,
      `🎵 Check out "${track.title}" by ${track.artist}`
    );
    setSharing(false);
  };

  const handleTip = async (amount: number) => {
    setTipping(true);
    try {
      // Get tipper context
      const tipper = await getUserContext();

      // Send USDC tip via Farcaster SDK
      const result = await sendTip(track.sharedBy.fid, amount);

      if (result.success) {
        // Record tip in database
        const response = await fetch(`/api/tracks/${track.id}/tip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            tipperFid: tipper.fid,
            tipperUsername: tipper.username,
            transaction: result.transaction,
          }),
        });

        if (response.ok) {
          // Show success animation
          setTipSuccess(true);
          setTimeout(() => setTipSuccess(false), 2000);

          // Update local state
          onTip(track.id);

          // Hide tip amounts
          setShowTipAmounts(false);
          setCustomAmount('');
        }
      }
    } catch (error) {
      console.error('Failed to tip:', error);
    } finally {
      setTipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(135deg, #07110b 0%, #0b1a12 100%)' }}>
      {/* Header */}
      <div className="p-4">
        <div className="panel-surface px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 relative rounded-xl overflow-hidden shadow-md">
              <Image src={track.artwork} alt={track.title} fill className="object-cover" />
            </div>
            <div>
              <h2 className="font-semibold text-[#0b1a12] text-base">{track.title}</h2>
              <p className="text-sm text-[#2d4a3a]">{track.artist}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Previous Track Button */}
            {hasPrevTrack && (
              <button
                onClick={handlePlayPrev}
                className="w-10 h-10 rounded-full bg-white/50 hover:bg-white/70 flex items-center justify-center transition-all hover:scale-105"
              >
                <ChevronLeft className="w-5 h-5 text-[#0b1a12]" />
              </button>
            )}

            {/* Next Track Button */}
            {hasNextTrack && (
              <button
                onClick={handlePlayNext}
                className="w-10 h-10 rounded-full bg-white/50 hover:bg-white/70 flex items-center justify-center transition-all hover:scale-105"
              >
                <ChevronRight className="w-5 h-5 text-[#0b1a12]" />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/50 hover:bg-white/70 flex items-center justify-center transition-all hover:scale-105"
            >
              <X className="w-5 h-5 text-[#0b1a12]" />
            </button>
          </div>
        </div>
      </div>

      {/* Player Content */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pb-8 pt-8 overflow-auto">

        {/* Track Info */}
        <div className="text-center mb-8 max-w-md">
          <h1 className="text-3xl font-bold text-white mb-2">{track.title}</h1>
          <p className="text-xl text-white/80 mb-4">{track.artist}</p>
          <div className="flex items-center justify-center gap-3">
            <span className="pill-tag">{track.platform}</span>
            <span className="text-sm text-white/60">
              by {track.sharedBy.username}
            </span>
          </div>
        </div>

        {/* Embedded Player */}
        {track.embedUrl && (
          <div className="w-full max-w-2xl mb-8">
            <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-[#2d4a3a]/40">
              {track.platform === 'soundcloud' ? (
                <iframe
                  width="100%"
                  height="166"
                  scrolling="no"
                  frameBorder="no"
                  allow="autoplay"
                  src={track.embedUrl}
                  className="w-full"
                />
              ) : track.platform === 'spotify' ? (
                <iframe
                  src={track.embedUrl}
                  width="100%"
                  height="352"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="w-full"
                />
              ) : (
                <iframe
                  width="100%"
                  height="315"
                  src={track.embedUrl}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full"
                />
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          {/* Success Animation */}
          {tipSuccess && (
            <div className="animate-bounce text-white text-lg font-bold">
              🎉 Tip sent successfully! 💰
            </div>
          )}

          {/* Tip Amount Selection */}
          {showTipAmounts && (
            <div className="panel-surface p-6 w-full animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-lg font-bold text-[#0b1a12] mb-4 text-center">
                Select Tip Amount (USDC)
              </h3>

              {/* Quick amounts */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {tipAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleTip(amount)}
                    disabled={tipping}
                    className="px-6 py-4 rounded-xl bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] text-[#0b1a12] font-bold transition-all shadow-md hover:scale-105 disabled:opacity-50"
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="space-y-3">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2d4a3a] opacity-50" />
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Custom amount"
                    min="1"
                    step="1"
                    className="input-shell w-full pl-11"
                  />
                </div>
                <button
                  onClick={() => customAmount && handleTip(Number(customAmount))}
                  disabled={!customAmount || tipping}
                  className="btn-pastel w-full disabled:opacity-50"
                >
                  {tipping ? 'Processing...' : 'Send Custom Tip'}
                </button>
              </div>

              <button
                onClick={() => setShowTipAmounts(false)}
                className="w-full mt-4 py-2 text-[#2d4a3a] hover:text-[#0b1a12] text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Main action buttons */}
          {!showTipAmounts && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setShowTipAmounts(true)}
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] text-[#0b1a12] font-bold transition-all shadow-lg shadow-[#7fd4a8]/30 hover:scale-105"
              >
                <DollarSign className="w-5 h-5" />
                <span>Tip</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#0b1a12]/20 text-sm font-semibold">
                  ${track.tips}
                </span>
              </button>

              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 border-2 border-white/30 text-white font-semibold transition-all disabled:opacity-50 hover:scale-105"
              >
                <Share2 className="w-5 h-5" />
                <span>{sharing ? 'Sharing...' : 'Share'}</span>
              </button>

              {/* Open in Platform Button */}
              {(track.platform === 'spotify' || track.platform === 'apple music') && (
                <a
                  href={track.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 border-2 border-white/30 text-white font-semibold transition-all hover:scale-105"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>
                    Open in {track.platform === 'spotify' ? 'Spotify' : 'Apple Music'}
                  </span>
                </a>
              )}
            </div>
          )}

          {/* Up Next Indicator */}
          {hasNextTrack && playlist && currentIndex !== undefined && (
            <div className="mt-6 panel-surface px-5 py-3 max-w-md mx-auto">
              <p className="text-xs text-[#2d4a3a] font-semibold mb-1.5">Up Next</p>
              <p className="text-sm text-[#0b1a12] font-medium">
                {playlist[currentIndex + 1].title} - {playlist[currentIndex + 1].artist}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
