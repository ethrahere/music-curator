'use client';

import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { erc20Abi, encodeFunctionData } from 'viem';
import sdk from '@farcaster/frame-sdk';
import { getUserContext } from '@/lib/farcaster';
import {
  USDC_ADDRESS,
  USDC_DECIMALS,
  DEFAULT_TIP_AMOUNTS,
} from '@/lib/constants';

interface TipButtonProps {
  trackId: string;
  curatorFid: number;
  curatorAddress: string; // Wallet address of curator
  curatorUsername: string;
  onTipSuccess?: (amount: number) => void;
  totalTips?: number; // Current tip total to display
  variant?: 'default' | 'compact'; // Display variant
}

export function TipButton({
  trackId,
  curatorFid,
  curatorAddress,
  curatorUsername,
  onTipSuccess,
  totalTips = 0,
  variant = 'default'
}: TipButtonProps) {
  const [tipAmount, setTipAmount] = useState('1.00');
  const [showModal, setShowModal] = useState(false);
  const [localTipTotal, setLocalTipTotal] = useState(totalTips);
  const [isSending, setIsSending] = useState(false);

  const tipAmounts = DEFAULT_TIP_AMOUNTS;

  // Sync local total with prop changes
  useEffect(() => {
    setLocalTipTotal(totalTips);
  }, [totalTips]);

  const handleTip = async (amount: number) => {
    console.log('handleTip called', { amount, curatorAddress });

    if (!curatorAddress) {
      console.log('No curator address');
      alert('This curator has not set up their wallet address yet');
      return;
    }

    setIsSending(true);
    try {
      // Use Farcaster SDK's ethereum provider directly (like Player.tsx does)
      const provider = sdk.wallet.ethProvider;

      // Get user's wallet address
      const accounts = await provider.request({
        method: 'eth_accounts'
      }) as string[];

      if (!accounts || accounts.length === 0) {
        alert('No wallet connected');
        return;
      }

      const fromAddress = accounts[0];
      console.log('User wallet address:', fromAddress);

      // Calculate amount in USDC smallest unit (6 decimals)
      const amountInSmallestUnit = BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)));
      console.log('Amount in USDC:', amountInSmallestUnit.toString());

      // Encode ERC-20 transfer function call using viem
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [curatorAddress as `0x${string}`, amountInSmallestUnit]
      });

      console.log('Sending transaction...');
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

      console.log('Transaction sent:', txHash);
      // Record in database
      await recordTipInDatabase(txHash, amount);

    } catch (error) {
      console.error('Tip error:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        alert('Transaction cancelled');
      } else {
        alert('Transaction failed: ' + errorMessage);
      }
    } finally {
      setIsSending(false);
    }
  };

  const recordTipInDatabase = async (txHash: string, amount: number) => {
    try {
      const tipper = await getUserContext();

      const response = await fetch(`/api/tracks/${trackId}/tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: txHash,
          fromFid: tipper.fid,
          toFid: curatorFid,
          requestedAmount: amount,
          timestamp: Date.now(),
          tipperUsername: tipper.username,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowModal(false);
        setTipAmount('1.00');
        const tipAmount = amount;
        setLocalTipTotal(prev => prev + tipAmount);
        if (onTipSuccess) {
          onTipSuccess(tipAmount);
        }
        alert(`$${amount} USDC sent successfully!`);
      } else {
        console.error('Failed to record tip:', data);
        alert('Tip sent but failed to record in database');
      }
    } catch (error) {
      console.error('Tip recording error:', error);
      alert('Tip sent but failed to record in database');
    }
  };


  const handleButtonClick = () => {
    console.log('Tip button clicked! Opening modal...', { curatorUsername, totalTips: localTipTotal });
    setShowModal(true);
  };

  return (
    <>
      {/* Tip Button */}
      {variant === 'compact' ? (
        <button
          onClick={handleButtonClick}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #a8e6c5 0%, #7fd4a8 100%)',
            boxShadow: '3px 3px 8px rgba(168, 230, 197, 0.4)',
          }}
        >
          <DollarSign className="w-4 h-4 text-[#0b1a12]" />
          <span className="mono-number text-sm font-bold text-[#0b1a12]">
            ${localTipTotal >= 1 ? localTipTotal.toFixed(0) : localTipTotal.toFixed(2)}
          </span>
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="btn-pastel"
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-sm font-bold lowercase">tip</span>
        </button>
      )}

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
                  onClick={() => {
                    console.log('Preset amount clicked:', amount);
                    handleTip(amount);
                  }}
                  disabled={isSending}
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
                onClick={() => {
                  console.log('Send tip clicked', { tipAmount, isSending });
                  if (tipAmount) {
                    handleTip(Number(tipAmount));
                  }
                }}
                disabled={!tipAmount || isSending}
                className="btn-neomorph w-full disabled:opacity-50 lowercase"
              >
                {isSending ? 'sending usdc...' : 'send tip'}
              </button>
            </div>

            <button
              onClick={() => setShowModal(false)}
              disabled={isSending}
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
