'use client';

import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, erc20Abi, type Address } from 'viem';
import sdk from '@farcaster/frame-sdk';
import { getUserContext } from '@/lib/farcaster';
import {
  USDC_ADDRESS,
  USDC_TOKEN_ID,
  ETH_TOKEN_ID,
  USDC_DECIMALS,
  ETH_DECIMALS,
  ETH_USD_ESTIMATE,
  SWAP_BUFFER_PERCENT,
  DEFAULT_TIP_AMOUNTS,
} from '@/lib/constants';

interface TipButtonProps {
  trackId: string;
  curatorFid: number;
  curatorAddress: string; // Wallet address of curator
  curatorUsername: string;
  onTipSuccess?: (amount: number) => void;
}

export function TipButton({
  trackId,
  curatorFid,
  curatorAddress,
  curatorUsername,
  onTipSuccess
}: TipButtonProps) {
  const [tipAmount, setTipAmount] = useState('1.00');
  const [showModal, setShowModal] = useState(false);
  const [showSwapPrompt, setShowSwapPrompt] = useState(false);
  const [pendingTipAmount, setPendingTipAmount] = useState(0);

  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

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

  // Check USDC balance (high-level, using wagmi)
  const checkUSDCBalance = (amount: number): boolean => {
    if (!address || !usdcBalance) {
      return false;
    }

    const amountNeeded = parseUnits(amount.toString(), USDC_DECIMALS);

    if (usdcBalance < amountNeeded) {
      setPendingTipAmount(amount);
      setShowSwapPrompt(true);
      return false;
    }

    return true;
  };

  const handleTip = (amount: number) => {
    // First check balance
    const hasBalance = checkUSDCBalance(amount);
    if (!hasBalance) return;

    const amountInUSDC = parseUnits(amount.toString(), USDC_DECIMALS);

    // Direct USDC transfer - user CANNOT change token (using high-level erc20Abi)
    writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [curatorAddress as Address, amountInUSDC],
    });
  };

  // Handle swap to USDC - swaps exact amount needed for tip
  const handleSwap = async () => {
    try {
      if (pendingTipAmount <= 0) {
        console.error('Invalid tip amount');
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
      }
    } catch (error) {
      console.error('Swap failed:', error);
    }
  };

  // Record tip when successful
  useEffect(() => {
    if (isSuccess && hash) {
      recordTipInDatabase();
    }
  }, [isSuccess, hash]);

  const recordTipInDatabase = async () => {
    try {
      const tipper = await getUserContext();

      const response = await fetch(`/api/tracks/${trackId}/tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: hash,
          fromFid: tipper.fid,
          toFid: curatorFid,
          requestedAmount: parseFloat(tipAmount),
          timestamp: Date.now(),
          tipperUsername: tipper.username,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowModal(false);
        setTipAmount('1.00');
        if (onTipSuccess) {
          onTipSuccess(parseFloat(tipAmount));
        }
      } else {
        console.error('Failed to record tip:', data);
      }
    } catch (error) {
      console.error('Tip recording error:', error);
    }
  };

  // Swap Prompt UI
  if (showSwapPrompt) {
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
  }

  return (
    <>
      {/* Tip Button */}
      <button
        onClick={() => setShowModal(true)}
        className="btn-pastel"
      >
        <DollarSign className="w-5 h-5" />
        <span className="text-sm font-bold lowercase">tip</span>
      </button>

      {/* Tip Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{
            background: 'rgba(236, 236, 236, 0.6)',
            backdropFilter: 'blur(12px)',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="panel-surface p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#2E2E2E] mb-1 text-center lowercase">
              tip @{curatorUsername}
            </h3>
            <p className="text-xs text-[#5E5E5E] text-center mb-4 lowercase">
              tips are sent in usdc on base
            </p>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {tipAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleTip(amount)}
                  disabled={isPending || isConfirming || !usdcBalance}
                  className="btn-neomorph px-6 py-4 font-bold disabled:opacity-50"
                >
                  ${amount}
                </button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="space-y-3">
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5E5E5E] opacity-50" />
                <input
                  type="number"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  placeholder="custom amount"
                  min="0.01"
                  step="0.01"
                  className="input-shell w-full !pl-12"
                />
              </div>
              <button
                onClick={() => tipAmount && handleTip(Number(tipAmount))}
                disabled={!tipAmount || isPending || isConfirming || !usdcBalance}
                className="btn-neomorph w-full disabled:opacity-50 lowercase"
              >
                {isConfirming ? 'confirming...' : isPending ? 'sending usdc...' : 'send tip'}
              </button>
            </div>

            <button
              onClick={() => setShowModal(false)}
              disabled={isPending || isConfirming}
              className="w-full mt-4 py-2 text-[#5E5E5E] hover:text-[#2E2E2E] text-sm font-medium transition-colors lowercase disabled:opacity-50"
            >
              cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
