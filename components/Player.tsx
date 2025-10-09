'use client';

import { MusicTrack } from '@/types/music';
import { X, DollarSign, Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getUserContext } from '@/lib/farcaster';
import sdk from '@farcaster/frame-sdk';
import { useState, useEffect } from 'react';

interface PlayerProps {
  track: MusicTrack;
  onClose: () => void;
  onTip: (trackId: string) => void;
  baseUrl: string;
  playlist?: MusicTrack[];
  currentIndex?: number;
  onPlayNext?: (nextTrack: MusicTrack) => void;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function Player({ track, onClose, onTip }: PlayerProps) {
  const [tipping, setTipping] = useState(false);
  const [coSigning, setCoSigning] = useState(false);
  const [hasCoSigned, setHasCoSigned] = useState(false);
  const [showTipAmounts, setShowTipAmounts] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [tipSuccess, setTipSuccess] = useState(false);
  const [coSignCount, setCoSignCount] = useState(0);
  const [localTipTotal, setLocalTipTotal] = useState(track.tips || 0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const tipAmounts = [1, 5, 10];

  // Toast system
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2000);
  };

  // Check if user has already co-signed this track
  useEffect(() => {
    const checkCoSign = async () => {
      try {
        const user = await getUserContext();
        const response = await fetch(`/api/tracks/${track.id}/cosign/check?userFid=${user.fid}`);
        const data = await response.json();
        if (data.success) {
          setHasCoSigned(data.hasCoSigned);
          setCoSignCount(data.coSignCount || 0);
        }
      } catch (error) {
        console.error('Failed to check co-sign status:', error);
      }
    };
    checkCoSign();
  }, [track.id]);

  // Body scroll lock when modal is open
  useEffect(() => {
    if (showTipAmounts) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showTipAmounts]);

  const handleCoSign = async () => {
    if (hasCoSigned || coSigning) return;

    setCoSigning(true);
    try {
      const user = await getUserContext();
      const response = await fetch(`/api/tracks/${track.id}/cosign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userFid: user.fid,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setHasCoSigned(true);
        setCoSignCount(prev => prev + 1);
        showToast('+1 Co-sign added 💫', 'success');
      } else {
        showToast(data.error || 'Already co-signed', 'error');
      }
    } catch (error) {
      console.error('Failed to co-sign:', error);
      showToast('Transaction failed', 'error');
    } finally {
      setCoSigning(false);
    }
  };


  const handleTip = async (amount: number) => {
    setTipping(true);
    try {
      const tipper = await getUserContext();
      const curatorFid = track.sharedBy.fid;

      const result = await sdk.actions.sendToken({
        token: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: (amount * 1000000).toString(),
        recipientFid: curatorFid,
      });

      if (!result.success) {
        console.log('Tip cancelled or failed:', result.reason);
        setTipping(false);
        return;
      }

      const response = await fetch(`/api/tracks/${track.id}/tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: result.send.transaction,
          fromFid: tipper.fid,
          toFid: curatorFid,
          requestedAmount: amount,
          timestamp: Date.now(),
          tipperUsername: tipper.username,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTipSuccess(true);
        setLocalTipTotal(prev => prev + amount);
        showToast(`Tip sent 💸`, 'success');
        setShowTipAmounts(false);
        setCustomAmount('');
        // Notify parent component that tip succeeded (optional callback)
        if (onTip) {
          onTip(track.id);
        }

        setTimeout(() => {
          setTipSuccess(false);
        }, 3000);
      } else {
        console.error('Failed to record tip in database:', data);
        showToast('Transaction failed', 'error');
      }
    } catch (error) {
      console.error('Failed to tip:', error);
      showToast('Transaction failed', 'error');
    } finally {
      setTipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#ECECEC]">
      {/* ToastFeedback - Top Center */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`panel-surface px-6 py-3 min-w-[200px] text-center animate-in fade-in slide-in-from-top-2 duration-200 ${
              toast.type === 'error' ? 'bg-red-100' : ''
            }`}
          >
            <p className={`text-sm font-semibold ${toast.type === 'error' ? 'text-red-800' : 'text-[#2E2E2E]'}`}>
              {toast.message}
            </p>
          </div>
        ))}
      </div>

      {/* HeaderBar */}
      <header className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="panel-surface px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              {/* Left: Close Button */}
              <button
                onClick={onClose}
                className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] flex items-center justify-center shadow-lg transition-all hover:scale-105"
              >
                <X className="w-5 h-5 text-[#0b1a12]" />
              </button>

              {/* Center: Logo */}
              <div className="flex-1 flex justify-center">
                <Image
                  src="/curio.png"
                  alt="Curio"
                  width={100}
                  height={32}
                  className="object-contain"
                  priority
                />
              </div>

              {/* Right: Empty placeholder for symmetry */}
              <div className="flex-shrink-0 w-9 h-9"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto px-4 pt-6 pb-24">
        <div className="max-w-2xl mx-auto">
          {/* TrackCard */}
          <div className="panel-surface overflow-hidden mb-6">
            {/* AlbumArt (full width) with embedded player */}
            {track.embedUrl && (
              <div className="relative w-full">
                <div
                  className="relative w-full overflow-hidden"
                  style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}
                >
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

            {/* Track Info Section */}
            <div className="p-6">
              {/* Track Title & Artist */}
              <h1 className="text-2xl font-bold text-[#2E2E2E] mb-1 lowercase" style={{ letterSpacing: '-0.02em' }}>
                {track.title}
              </h1>
              <p className="text-lg text-[#5E5E5E] mb-4 lowercase">{track.artist}</p>

              {/* Review Text - only if available */}
              {track.review && (
                <p className="text-sm text-[#5E5E5E] mb-4 italic lowercase">
                  &ldquo;{track.review}&rdquo;
                </p>
              )}

              {/* CuratorInfo */}
              <Link href={`/curator/${track.sharedBy.username}`} className="block mb-4">
                <div className="panel-surface-flat p-2 flex items-center gap-3 hover:scale-[1.01] transition-transform">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F36C5B] to-[#B8E1C2] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      {track.sharedBy.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2E2E2E] lowercase">@{track.sharedBy.username}</p>
                    <p className="text-xs text-[#5E5E5E] lowercase">curator</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-[#EFBF56]/30 flex items-center gap-1.5">
                    <span className="text-xs">⭐</span>
                    <span className="mono-number text-xs font-bold text-[#2E2E2E]">
                      {track.sharedBy.curatorScore || 0}
                    </span>
                  </div>
                </div>
              </Link>

              {/* SocialProofBar - Moved here from bottom */}
              <div className="text-center">
                <p className="mono-number text-xs text-[#5E5E5E]">
                  💫 {coSignCount} Co-signs · 💸 ${localTipTotal.toFixed(2)} Tipped
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ActionBar - Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#ECECEC] px-4 py-3">
        {/* Control Bar Panel - Synth-like raised strip */}
        <div
          className="max-w-2xl mx-auto p-3 grid grid-cols-2 gap-3"
          style={{
            background: '#F6F6F6',
            borderRadius: '18px',
            boxShadow: '6px 6px 12px #d0d0d0, -6px -6px 12px #ffffff',
          }}
        >
          {/* Co-sign Button */}
          <button
            onClick={handleCoSign}
            disabled={hasCoSigned || coSigning}
            className={`
              py-5 px-4 flex items-center justify-center gap-2 rounded-[18px]
              ${hasCoSigned ? 'cursor-default pointer-events-none' : 'hover:scale-[1.02]'}
              transition-all duration-100
            `}
            style={
              hasCoSigned
                ? {
                    background: '#F6F6F6',
                    boxShadow: 'inset 6px 6px 12px #d0d0d0, inset -6px -6px 12px #ffffff',
                  }
                : {
                    background: '#F6F6F6',
                    borderRadius: '18px',
                    boxShadow: '4px 4px 8px #d0d0d0, -4px -4px 8px #ffffff',
                  }
            }
          >
            <Heart
              className={`w-5 h-5 transition-all duration-100 ${
                hasCoSigned ? 'text-[#F36C5B] fill-[#F36C5B]' : 'text-[#5E5E5E]'
              }`}
              style={
                hasCoSigned
                  ? { filter: 'drop-shadow(0 0 4px rgba(243, 108, 91, 0.33))' }
                  : undefined
              }
            />
            <span className={`text-sm font-bold lowercase ${hasCoSigned ? 'opacity-70' : ''}`}>
              {coSigning ? 'signing...' : hasCoSigned ? 'co-signed 💫' : 'co-sign'}
            </span>
          </button>

          {/* Tip Button */}
          <button
            onClick={() => setShowTipAmounts(true)}
            disabled={showTipAmounts}
            className={`
              py-5 px-4 flex items-center justify-center gap-2
              ${tipSuccess ? 'animate-pulse' : ''}
              disabled:opacity-50
            `}
            style={{
              background: 'linear-gradient(135deg, #B8E1C2 0%, #a8d4b2 100%)',
              borderRadius: '18px',
              boxShadow: tipSuccess
                ? '0 0 20px rgba(184, 225, 194, 0.8), 4px 4px 12px rgba(184, 225, 194, 0.3)'
                : '4px 4px 12px rgba(184, 225, 194, 0.3)',
              color: '#2E2E2E',
              fontWeight: 'bold',
              transition: 'all 0.08s ease-in-out',
            }}
          >
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-bold lowercase">tip</span>
          </button>
        </div>
      </div>

      {/* Tip Modal - Portal Overlay */}
      {showTipAmounts && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{
            background: 'rgba(236, 236, 236, 0.6)',
            backdropFilter: 'blur(12px)',
          }}
          onClick={() => setShowTipAmounts(false)}
        >
          <div
            className="panel-surface p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#2E2E2E] mb-4 text-center lowercase">
              tip amount (usdc)
            </h3>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {tipAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleTip(amount)}
                  disabled={tipping}
                  className="btn-neomorph px-6 py-4 font-bold disabled:opacity-50"
                >
                  ${amount}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5E5E5E] opacity-50" />
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="custom amount"
                  min="1"
                  step="1"
                  className="input-shell w-full !pl-12"
                />
              </div>
              <button
                onClick={() => customAmount && handleTip(Number(customAmount))}
                disabled={!customAmount || tipping}
                className="btn-neomorph w-full disabled:opacity-50 lowercase"
              >
                {tipping ? 'processing...' : 'send tip'}
              </button>
            </div>

            <button
              onClick={() => setShowTipAmounts(false)}
              className="w-full mt-4 py-2 text-[#5E5E5E] hover:text-[#2E2E2E] text-sm font-medium transition-colors lowercase"
            >
              cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
