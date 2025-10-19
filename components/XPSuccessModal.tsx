'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles, TrendingUp } from 'lucide-react';
import Image from 'next/image';

interface TasteOverlapCurator {
  fid: number;
  username: string;
  pfpUrl?: string;
}

interface XPActivity {
  type: 'share' | 'taste_overlap';
  xp: number;
  curator?: TasteOverlapCurator;
}

export interface XPData {
  earned: number;
  total: number;
  activities: XPActivity[];
}

interface XPSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  xpData: XPData | null;
  trackTitle: string;
}

export default function XPSuccessModal({
  isOpen,
  onClose,
  xpData,
  trackTitle,
}: XPSuccessModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [isOpen]);

  if (!isOpen || !xpData) return null;

  const tasteOverlapActivities = xpData.activities.filter(a => a.type === 'taste_overlap');
  const shareXP = xpData.activities.find(a => a.type === 'share')?.xp || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`
          panel-surface max-w-md w-full mx-4 p-6 relative
          transform transition-all duration-300
          ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5E5E5E] hover:text-[#2E2E2E] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] mb-4">
            <Sparkles className="w-8 h-8 text-[#0b1a12]" />
          </div>
          <h2 className="text-2xl font-bold text-[#2E2E2E] mb-2 lowercase">
            music shared!
          </h2>
          <p className="text-sm text-[#5E5E5E] lowercase">
            {trackTitle}
          </p>
        </div>

        {/* XP earned */}
        <div className="bg-[#ECECEC] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#5E5E5E] lowercase">
              xp earned
            </span>
            <span className="text-2xl font-bold text-[#2E2E2E] mono-number">
              +{xpData.earned}
            </span>
          </div>

          {/* Breakdown */}
          <div className="space-y-2 mt-3">
            {/* Share XP */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#5E5E5E]">• Shared track</span>
              <span className="font-bold text-[#2E2E2E] mono-number">+{shareXP}</span>
            </div>

            {/* Taste overlap XP */}
            {tasteOverlapActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#5E5E5E]">💫 Taste overlap with</span>
                  {activity.curator?.pfpUrl ? (
                    <div className="w-5 h-5 rounded-full overflow-hidden border border-[#a8e6c5]">
                      <Image
                        src={activity.curator.pfpUrl}
                        alt={activity.curator.username || 'curator'}
                        width={20}
                        height={20}
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <span className="font-semibold text-[#2E2E2E]">
                    @{activity.curator?.username || 'curator'}
                  </span>
                </div>
                <span className="font-bold text-[#2E2E2E] mono-number">+{activity.xp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total XP */}
        <div className="bg-gradient-to-br from-[#a8e6c5] to-[#7fd4a8] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#0b1a12]" />
              <span className="font-semibold text-[#0b1a12] lowercase">
                your total xp
              </span>
            </div>
            <span className="text-2xl font-bold text-[#0b1a12] mono-number">
              {xpData.total.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Continue button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-[#2E2E2E] text-white font-semibold rounded-lg hover:bg-[#1a1a1a] transition-colors lowercase"
        >
          continue
        </button>
      </div>
    </div>
  );
}
