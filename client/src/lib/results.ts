// Shared vocabulary for prioritization results. Mirrors
// server/app/services/workshop_results.py so the matrix, analytics,
// result cards and exports all use the same names and thresholds.

export type QuadrantKey = 'quick_wins' | 'strategic_bets' | 'nice_to_have' | 'dont_do';
export type ConsensusLevel = 'high' | 'moderate' | 'needs_discussion';

export const QUADRANT_LABELS: Record<QuadrantKey, string> = {
    quick_wins: 'Quick wins',
    strategic_bets: 'Strategic bets',
    nice_to_have: 'Nice to have',
    dont_do: 'Deprioritize',
};

export const QUADRANT_COLORS: Record<QuadrantKey, string> = {
    quick_wins: '#10b981',
    strategic_bets: '#8b5cf6',
    nice_to_have: '#3b82f6',
    dont_do: '#ef4444',
};

export const CONSENSUS_LABELS: Record<ConsensusLevel, string> = {
    high: 'High consensus',
    moderate: 'Moderate',
    needs_discussion: 'Needs discussion',
};

export const CONSENSUS_CLASSES: Record<ConsensusLevel, string> = {
    high: 'bg-emerald-500/15 text-emerald-600',
    moderate: 'bg-amber-500/15 text-amber-600',
    needs_discussion: 'bg-red-500/15 text-red-600',
};

/** Quadrant from 0-100 matrix coordinates (split at 50/50). */
export function quadrantFor(x?: number | null, y?: number | null): QuadrantKey | null {
    if (x == null || y == null) return null;
    if (y >= 50) return x >= 50 ? 'quick_wins' : 'strategic_bets';
    return x >= 50 ? 'nice_to_have' : 'dont_do';
}

/** Older analytics endpoints report High / Medium / Low. */
export function toConsensusLevel(value?: string | null): ConsensusLevel | null {
    switch ((value || '').toLowerCase()) {
        case 'high': return 'high';
        case 'medium':
        case 'moderate': return 'moderate';
        case 'low':
        case 'needs_discussion': return 'needs_discussion';
        default: return null;
    }
}

export const rankLabel = (rank?: number | null, tied?: boolean) => (rank ? `#${rank}${tied ? ' (tie)' : ''}` : 'Not scored');

export interface RankedResult {
    id: string;
    title: string;
    description?: string;
    scores: Record<string, number>;
    total_score: number;
    vote_count: number;
    x?: number | null;
    y?: number | null;
    rank?: number | null;
    tied?: boolean;
    normalized_score?: number;
    scale_max?: number;
    agreement?: number | null;
    consensus_level?: ConsensusLevel | null;
    quadrant?: QuadrantKey | null;
}
