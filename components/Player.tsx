'use client';

import { MusicTrack } from '@/types/music';
import { X, DollarSign, Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getUserContext } from '@/lib/farcaster';
import sdk from '@farcaster/frame-sdk';
import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { parseUnits, erc20Abi, encodeFunctionData } from 'viem';
import {
  USDC_ADDRESS,
  USDC_TOKEN_ID,
  ETH_TOKEN_ID,
  USDC_DECIMALS,
  ETH_DECIMALS,
  ETH_USD_ESTIMATE,
  SWAP_BUFFER_PERCENT,
  DEFAULT_TIP_AMOUNTS,
  TOAST_DURATION,
  TIP_SUCCESS_DURATION,
} from '@/lib/constants';

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
  const [coSigning, setCoSigning] = useState(false);
  const [hasCoSigned, setHasCoSigned] = useState(false);
  const [showTipAmounts, setShowTipAmounts] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [tipSuccess, setTipSuccess] = useState(false);
  const [coSignCount, setCoSignCount] = useState(0);
  const [localTipTotal, setLocalTipTotal] = useState(track.tips || 0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showSwapPrompt, setShowSwapPrompt] = useState(false);
  const [pendingTipAmount, setPendingTipAmount] = useState(0);

  const { address } = useAccount();
  const [isTipping, setIsTipping] = useState(false);

  // Read user's USDC balance using high-level wagmi hook
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const tipAmounts = DEFAULT_TIP_AMOUNTS;

  // Get curator's wallet address from track data (no API call needed!)
  const curatorAddress = track.sharedBy.walletAddress;

  // Toast system
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, TOAST_DURATION);
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


  // Check USDC balance before tipping (high-level, using wagmi)
  const checkUSDCBalance = async (amount: number): Promise<boolean> => {
    if (!address || !usdcBalance) {
      showToast('Unable to check balance', 'error');
      return false;
    }

    const amountNeeded = parseUnits(amount.toString(), USDC_DECIMALS);

    if (usdcBalance < amountNeeded) {
      setShowSwapPrompt(true);
      setPendingTipAmount(amount);
      return false;
    }

    return true;
  };

  const handleTip = async (amount: number) => {
    if (!curatorAddress) {
      showToast('Curator address not found', 'error');
      return;
    }

    setPendingTipAmount(amount);
    setIsTipping(true);

    try {
      // Get ethereum provider from SDK
      const provider = sdk.wallet.ethProvider;

      // Get user's wallet address
      const accounts = await provider.request({
        method: 'eth_accounts'
      }) as string[];

      if (!accounts || accounts.length === 0) {
        showToast('No wallet connected', 'error');
        setIsTipping(false);
        return;
      }

      const fromAddress = accounts[0];

      // Calculate amount in USDC smallest unit (6 decimals)
      const amountInSmallestUnit = BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)));

      // Encode ERC-20 transfer function call using viem
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [curatorAddress as `0x${string}`, amountInSmallestUnit]
      });

      // Trigger Warpcast transaction UI - this opens native confirmation modal
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: fromAddress as `0x${string}`,
          to: USDC_ADDRESS,
          data: data as `0x${string}`,
          value: '0x0'
        }]
      }) as string;

      // Record in database
      await recordTipInDatabase(txHash, amount);

    } catch (error) {
      console.error('Tip error:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        showToast('Transaction cancelled', 'error');
      } else {
        showToast('Transaction failed', 'error');
      }
      setPendingTipAmount(0);
    } finally {
      setIsTipping(false);
    }
  };

  // Handle swap to USDC - swaps exact amount needed for tip
  const handleSwap = async () => {
    try {
      if (pendingTipAmount <= 0) {
        showToast('Invalid tip amount', 'error');
        return;
      }

      // Calculate how much USDC is needed
      const currentBalance = usdcBalance || BigInt(0);
      const amountNeeded = parseUnits(pendingTipAmount.toString(), USDC_DECIMALS);
      const shortfall = amountNeeded - currentBalance;

      if (shortfall <= BigInt(0)) {
        // User already has enough, just close the modal
        setShowSwapPrompt(false);
        return;
      }

      // Note: swapToken only accepts sellAmount, not buyAmount
      // We'll estimate the ETH needed (using ETH_USD_ESTIMATE ratio)
      // The user will see the actual swap details in the Farcaster modal
      const shortfallUSD = Number(shortfall) / Math.pow(10, USDC_DECIMALS);
      const estimatedETH = (shortfallUSD / ETH_USD_ESTIMATE) * (1 + SWAP_BUFFER_PERCENT);
      const sellAmount = parseUnits(estimatedETH.toFixed(ETH_DECIMALS), ETH_DECIMALS);

      const result = await sdk.actions.swapToken({
        buyToken: USDC_TOKEN_ID,
        sellToken: ETH_TOKEN_ID,
        sellAmount: sellAmount.toString(),
      });

      if (result.success) {
        setShowSwapPrompt(false);
        // Refetch balance after swap
        await refetchBalance();
        showToast('Swap complete! Try tipping again', 'success');
      }
    } catch (error) {
      console.error('Swap failed:', error);
      showToast('Swap failed', 'error');
    }
  };

  const recordTipInDatabase = async (txHash: string, amount: number) => {
    try {
      const tipper = await getUserContext();

      const response = await fetch(`/api/tracks/${track.id}/tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: txHash,
          fromFid: tipper.fid,
          toFid: track.sharedBy.fid,
          requestedAmount: amount,
          timestamp: Date.now(),
          tipperUsername: tipper.username,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTipSuccess(true);
        setLocalTipTotal(prev => prev + amount);
        showToast(`$${amount} USDC sent 💸`, 'success');
        setShowTipAmounts(false);
        setCustomAmount('');
        setPendingTipAmount(0);

        if (onTip) {
          onTip(track.id);
        }

        setTimeout(() => {
          setTipSuccess(false);
        }, TIP_SUCCESS_DURATION);
      } else {
        console.error('Failed to record tip:', data);
        showToast(data.error || 'Failed to record tip', 'error');
      }
    } catch (error) {
      console.error('Tip recording error:', error);
      showToast('Failed to record tip', 'error');
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
      <div className="flex-1 overflow-auto px-4 pt-2 pb-24">
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
          className={`max-w-2xl mx-auto p-3 ${curatorAddress ? 'grid grid-cols-2' : 'flex justify-center'} gap-3`}
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

          {/* Tip Button - Only show if curator has wallet address */}
          {curatorAddress && (
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
          )}
        </div>
      </div>

      {/* Swap Prompt Modal */}
      {showSwapPrompt && (() => {
        const currentBalance = usdcBalance || BigInt(0);
        const amountNeeded = parseUnits(pendingTipAmount.toString(), USDC_DECIMALS);
        const shortfall = amountNeeded - currentBalance;
        const shortfallUSD = Number(shortfall) / Math.pow(10, USDC_DECIMALS);
        const currentUSD = Number(currentBalance) / Math.pow(10, USDC_DECIMALS);

        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{
              background: 'rgba(236, 236, 236, 0.6)',
              backdropFilter: 'blur(12px)',
            }}
            onClick={() => setShowSwapPrompt(false)}
          >
            <div
              className="panel-surface p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-[#2E2E2E] mb-2 text-center lowercase">
                need more usdc
              </h3>
              <div className="text-sm text-[#5E5E5E] text-center mb-4 space-y-1">
                <p className="lowercase">tip amount: ${pendingTipAmount.toFixed(2)} usdc</p>
                <p className="lowercase">your balance: ${currentUSD.toFixed(2)} usdc</p>
                <p className="font-bold text-[#2E2E2E] lowercase">need to swap: ${shortfallUSD.toFixed(2)} usdc</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleSwap}
                  className="btn-pastel w-full"
                >
                  swap ${shortfallUSD.toFixed(2)} usdc
                </button>
                <button
                  onClick={() => setShowSwapPrompt(false)}
                  className="w-full py-2 text-[#5E5E5E] hover:text-[#2E2E2E] text-sm font-medium transition-colors lowercase"
                >
                  cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tip Modal - Portal Overlay */}
      {showTipAmounts && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{
            background: 'rgba(236, 236, 236, 0.6)',
            backdropFilter: 'blur(12px)',
          }}
          onClick={() => !isTipping && setShowTipAmounts(false)}
        >
          <div
            className="panel-surface p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#2E2E2E] mb-1 text-center lowercase">
              tip amount
            </h3>
            <p className="text-xs text-[#5E5E5E] text-center mb-4 lowercase">
              tips are sent in usdc on base
            </p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {tipAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleTip(amount)}
                  disabled={isTipping || !curatorAddress}
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
                  min="0.01"
                  step="0.01"
                  className="input-shell w-full !pl-12"
                />
              </div>
              <button
                onClick={() => customAmount && handleTip(Number(customAmount))}
                disabled={!customAmount || isTipping || !curatorAddress}
                className="btn-neomorph w-full disabled:opacity-50 lowercase"
              >
                {isTipping ? 'sending usdc...' : 'send tip'}
              </button>
            </div>

            <button
              onClick={() => setShowTipAmounts(false)}
              disabled={isTipping}
              className="w-full mt-4 py-2 text-[#5E5E5E] hover:text-[#2E2E2E] text-sm font-medium transition-colors lowercase disabled:opacity-50"
            >
              cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
