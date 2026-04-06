import { TrustScoreBreakdownItem, TrustScoreResult } from './types';

export function getNextTrustStep(score: TrustScoreResult): TrustScoreBreakdownItem | null {
  return score.checklist.find((item) => !item.earned) || null;
}

export function getTrustCompletionStats(score: TrustScoreResult) {
  const earnedCount = score.checklist.filter((item) => item.earned).length;
  const totalCount = score.checklist.length;
  return {
    earnedCount,
    totalCount,
    percentComplete: Math.round((earnedCount / totalCount) * 100),
  };
}
