// Friendly, consistent names for workshop phases. Raw codes (INTAKE,
// SCORING, ANALYSIS) are API values and should never be shown to users.

export type PhaseCode = 'DRAFT' | 'INTAKE' | 'SCORING' | 'ANALYSIS';

export const PHASE_STEPS: { code: PhaseCode | 'COMPLETE'; label: string; participantHint: string }[] = [
    { code: 'INTAKE', label: 'Capture ideas', participantHint: 'Add your AI use case ideas.' },
    { code: 'SCORING', label: 'Score', participantHint: 'Score each use case against the criteria.' },
    { code: 'ANALYSIS', label: 'Results', participantHint: 'See which use cases came out on top.' },
    { code: 'COMPLETE', label: 'Complete', participantHint: 'The workshop has finished. Thank you!' },
];

const LABELS: Record<string, string> = {
    DRAFT: 'Not started',
    LOBBY: 'Not started',
    INTAKE: 'Capture ideas',
    SCORING: 'Score',
    ANALYSIS: 'Results',
    COMPLETE: 'Complete',
    COMPLETED: 'Complete',
};

export function phaseLabel(code?: string | null): string {
    if (!code) return 'Not started';
    return LABELS[code.toUpperCase()] || code.charAt(0) + code.slice(1).toLowerCase();
}
