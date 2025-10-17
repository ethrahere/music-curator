/**
 * Curator Score System
 *
 * Centralized configuration for curator scoring calculations.
 * Update these constants to change how curator scores are calculated.
 */

export const CURATOR_SCORE_CONFIG = {
  // Points awarded per co-sign received on a track
  POINTS_PER_COSIGN: 1,

  // Points awarded per $1 USD received in tips
  POINTS_PER_USDC: 5,
} as const;

/**
 * Calculate curator score from engagement metrics
 */
export function calculateCuratorScore(params: {
  cosignCount: number;
  totalTipsUsd: number;
}): number {
  const { cosignCount, totalTipsUsd } = params;

  const cosignPoints = cosignCount * CURATOR_SCORE_CONFIG.POINTS_PER_COSIGN;
  const tipPoints = Math.round(totalTipsUsd * CURATOR_SCORE_CONFIG.POINTS_PER_USDC);

  return cosignPoints + tipPoints;
}

/**
 * Get human-readable description of score breakdown
 */
export function getCuratorScoreBreakdown(params: {
  cosignCount: number;
  totalTipsUsd: number;
}): {
  total: number;
  cosignPoints: number;
  tipPoints: number;
  breakdown: string;
} {
  const { cosignCount, totalTipsUsd } = params;

  const cosignPoints = cosignCount * CURATOR_SCORE_CONFIG.POINTS_PER_COSIGN;
  const tipPoints = Math.round(totalTipsUsd * CURATOR_SCORE_CONFIG.POINTS_PER_USDC);
  const total = cosignPoints + tipPoints;

  return {
    total,
    cosignPoints,
    tipPoints,
    breakdown: `${cosignPoints} pts (${cosignCount} co-signs) + ${tipPoints} pts ($${totalTipsUsd.toFixed(2)} tips)`,
  };
}
