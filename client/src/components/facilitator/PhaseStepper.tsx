import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Flag } from 'lucide-react';
import { Button } from '../ui/Button';
import { ConfirmationModal } from '../ConfirmationModal';
import { PHASE_STEPS, phaseLabel } from '../../lib/workshopPhases';
import type { WorkshopProgress } from '../../hooks/useWorkshopProgress';

interface PhaseStepperProps {
    phase: string;
    completed: boolean;
    progress: WorkshopProgress | null;
    onSetPhase: (phase: 'INTAKE' | 'SCORING' | 'ANALYSIS') => Promise<void> | void;
    onSetCompleted: (completed: boolean) => Promise<void> | void;
}

type Action = { label: string; title: string; message: string; run: () => Promise<void> | void; variant: 'warning' | 'info' };

/**
 * Capture ideas → Score → Results → Complete, with a confirmation that shows
 * readiness before moving the whole room, and a way back at every step.
 */
export function PhaseStepper({ phase, completed, progress, onSetPhase, onSetCompleted }: PhaseStepperProps) {
    const [pending, setPending] = useState<Action | null>(null);
    const [busy, setBusy] = useState(false);

    const current = completed ? 3 : phase === 'ANALYSIS' ? 2 : phase === 'SCORING' ? 1 : phase === 'INTAKE' ? 0 : -1;
    const p = progress;
    const ofParticipants = (n: number) => (p ? `${n} of ${p.participants} participant${p.participants === 1 ? '' : 's'}` : '');

    const next: Action | null =
        current === -1 ? {
            label: 'Start capturing ideas', title: 'Start capturing ideas?', variant: 'info',
            message: 'Participants who have joined will be asked to add their AI use case ideas.',
            run: () => onSetPhase('INTAKE'),
        } : current === 0 ? {
            label: 'Next: Score', title: 'Move everyone to scoring?', variant: 'warning',
            message: p
                ? `${p.use_cases} use case${p.use_cases === 1 ? '' : 's'} captured from ${ofParticipants(p.submitters)}. Anyone still writing keeps their draft and can submit before scoring.`
                : 'Participants will move to scoring. Anyone still writing keeps their draft.',
            run: () => onSetPhase('SCORING'),
        } : current === 1 ? {
            label: 'Next: Show results', title: 'Close scoring and show results?', variant: 'warning',
            message: p
                ? `${ofParticipants(p.scorers)} have scored at least one use case. You can come back to scoring later if needed.`
                : 'Scoring closes and results are shown. You can come back to scoring later if needed.',
            run: () => onSetPhase('ANALYSIS'),
        } : current === 2 ? {
            label: 'Complete workshop', title: 'Complete this workshop?', variant: 'info',
            message: 'The workshop is marked complete and listed with its completion date. Results stay available, and you can reopen it.',
            run: () => onSetCompleted(true),
        } : null;

    const back: Action | null =
        current === 1 ? {
            label: `Back to ${PHASE_STEPS[0].label}`, title: 'Go back to capturing ideas?', variant: 'warning',
            message: 'Participants return to adding ideas. Scores already given are kept.',
            run: () => onSetPhase('INTAKE'),
        } : current === 2 ? {
            label: `Back to ${PHASE_STEPS[1].label}`, title: 'Reopen scoring?', variant: 'warning',
            message: 'Participants return to scoring. Nothing is deleted.',
            run: () => onSetPhase('SCORING'),
        } : current === 3 ? {
            label: 'Reopen workshop', title: 'Reopen this workshop?', variant: 'info',
            message: 'The workshop goes back to the Results step and is no longer marked complete.',
            run: () => onSetCompleted(false),
        } : null;

    const confirm = async () => {
        if (!pending) return;
        setBusy(true);
        try {
            await pending.run();
        } finally {
            setBusy(false);
            setPending(null);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            <nav aria-label="Workshop steps">
                <ol className="flex flex-wrap items-center gap-1">
                    {PHASE_STEPS.map((step, idx) => {
                        const state = idx < current ? 'done' : idx === current ? 'current' : 'todo';
                        return (
                            <li key={step.code} className="flex items-center gap-1">
                                <span
                                    aria-current={state === 'current' ? 'step' : undefined}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${state === 'current'
                                        ? 'bg-brand-violet text-white'
                                        : state === 'done'
                                            ? 'bg-brand-violet/10 text-brand-violet'
                                            : 'theme-bg-tertiary contrast-muted'
                                        }`}
                                >
                                    {state === 'done' ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <span aria-hidden="true">{idx + 1}</span>}
                                    {step.label}
                                    {state === 'done' && <span className="sr-only">(done)</span>}
                                </span>
                                {idx < PHASE_STEPS.length - 1 && <span className="contrast-muted" aria-hidden="true">›</span>}
                            </li>
                        );
                    })}
                </ol>
            </nav>
            {current === -1 && <span className="text-xs contrast-muted">{phaseLabel(phase)}</span>}
            <div className="flex gap-2 ml-auto">
                {back && (
                    <Button variant="secondary" onClick={() => setPending(back)} disabled={busy}>
                        <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" /> {back.label}
                    </Button>
                )}
                {next && (
                    <Button onClick={() => setPending(next)} disabled={busy}>
                        {current === 2 ? <Flag className="w-4 h-4 mr-2" aria-hidden="true" /> : null}
                        {next.label}
                        {current !== 2 && <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />}
                    </Button>
                )}
            </div>
            <ConfirmationModal
                isOpen={!!pending}
                onClose={() => setPending(null)}
                onConfirm={confirm}
                title={pending?.title || ''}
                message={pending?.message || ''}
                confirmText={pending?.label.replace(/^Next: /, '') || 'Confirm'}
                variant={pending?.variant || 'info'}
            />
        </div>
    );
}
