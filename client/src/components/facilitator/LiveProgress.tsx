import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Keyboard, Square, Timer, Users, Lightbulb, CheckCircle2, Hourglass } from 'lucide-react';
import { Button } from '../ui/Button';
import type { WorkshopProgress } from '../../hooks/useWorkshopProgress';

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string | number; hint?: string }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg theme-bg-tertiary min-w-[140px] flex-1">
            <span className="text-brand-violet" aria-hidden="true">{icon}</span>
            <div>
                <div className="text-xs contrast-muted">{label}</div>
                <div className="text-xl font-bold theme-text-primary">{value}</div>
                {hint && <div className="text-[11px] contrast-muted">{hint}</div>}
            </div>
        </div>
    );
}

/** Joined / submitted / scored / remaining, live during capture and scoring. */
export function LiveProgressPanel({ progress, phase }: { progress: WorkshopProgress | null; phase: string }) {
    if (!progress) return null;
    const { participants, use_cases, submitters, scorers } = progress;
    const waitingOn = phase === 'SCORING' ? participants - scorers : participants - submitters;
    return (
        <section aria-label="Live progress" className="flex flex-wrap gap-3" aria-live="polite">
            <Stat icon={<Users className="w-5 h-5" />} label="Joined" value={participants} />
            <Stat icon={<Lightbulb className="w-5 h-5" />} label="Use cases" value={use_cases} hint={`from ${submitters} participant${submitters === 1 ? '' : 's'}`} />
            <Stat icon={<CheckCircle2 className="w-5 h-5" />} label="Have scored" value={scorers} />
            <Stat
                icon={<Hourglass className="w-5 h-5" />}
                label={phase === 'SCORING' ? 'Not scored yet' : 'No ideas yet'}
                value={Math.max(0, waitingOn)}
            />
        </section>
    );
}

interface ActiveCardControlsProps {
    useCases: { id: string; title: string }[];
    activeCardId: string | null;
    progress: WorkshopProgress | null;
    onPresent: (useCaseId: string | null) => void;
}

const TIMER_PRESETS = [60, 120, 180];

const isTyping = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

/**
 * Step through cards during scoring: previous / next / stop, live vote count,
 * optional countdown, and keyboard shortcuts (← → S, ? for help).
 */
export function ActiveCardControls({ useCases, activeCardId, progress, onPresent }: ActiveCardControlsProps) {
    const [remaining, setRemaining] = useState<number | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    const index = useCases.findIndex((uc) => uc.id === activeCardId);
    const active = index >= 0 ? useCases[index] : null;
    const votes = active ? progress?.votes_by_use_case?.[active.id] ?? 0 : 0;

    const goTo = useCallback((offset: number) => {
        if (!useCases.length) return;
        const start = index < 0 ? (offset > 0 ? -1 : useCases.length) : index;
        const nextIndex = Math.min(useCases.length - 1, Math.max(0, start + offset));
        if (useCases[nextIndex] && useCases[nextIndex].id !== activeCardId) {
            setRemaining(null);
            onPresent(useCases[nextIndex].id);
        }
    }, [useCases, index, activeCardId, onPresent]);

    const stop = useCallback(() => {
        setRemaining(null);
        if (activeCardId) onPresent(null);
    }, [activeCardId, onPresent]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); goTo(1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(-1); }
            else if (e.key === 's' || e.key === 'S') { stop(); }
            else if (e.key === '?') { setShowHelp((v) => !v); }
            else if (e.key === 'Escape') { setShowHelp(false); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [goTo, stop]);

    useEffect(() => {
        if (remaining === null || remaining <= 0) return;
        const t = setTimeout(() => setRemaining((r) => (r === null ? null : r - 1)), 1000);
        return () => clearTimeout(t);
    }, [remaining]);

    const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    return (
        <section aria-label="Card being scored" className="rounded-xl border border-brand-violet/30 bg-brand-violet/5 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-brand-violet font-semibold">
                        {active ? `Now scoring · card ${index + 1} of ${useCases.length}` : 'No card being scored'}
                    </div>
                    <div className="text-lg font-bold theme-text-primary truncate">
                        {active ? active.title : 'Press Next (→) to present the first use case'}
                    </div>
                    {active && progress && (
                        <div className="text-sm contrast-muted" aria-live="polite">
                            {votes} of {progress.participants} scored
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" onClick={() => goTo(-1)} disabled={index <= 0} aria-label="Previous card">
                        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    </Button>
                    <Button onClick={() => goTo(1)} disabled={!useCases.length || index >= useCases.length - 1}>
                        {active ? 'Next card' : 'Present first card'} <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
                    </Button>
                    <Button variant="secondary" onClick={stop} disabled={!active}>
                        <Square className="w-4 h-4 mr-1" aria-hidden="true" /> Stop scoring
                    </Button>
                    <Button variant="ghost" onClick={() => setShowHelp((v) => !v)} aria-label="Keyboard shortcuts" aria-expanded={showHelp}>
                        <Keyboard className="w-4 h-4" aria-hidden="true" />
                    </Button>
                </div>
            </div>

            {active && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Timer className="w-4 h-4 contrast-muted" aria-hidden="true" />
                    {remaining === null ? (
                        <>
                            <span className="contrast-muted">Timer:</span>
                            {TIMER_PRESETS.map((s) => (
                                <button key={s} type="button" className="px-2 py-1 rounded border theme-border hover:bg-brand-violet/10" onClick={() => setRemaining(s)}>
                                    {s / 60} min
                                </button>
                            ))}
                        </>
                    ) : (
                        <>
                            <span role="timer" aria-live="off" className={`font-mono font-bold ${remaining === 0 ? 'text-semantic-danger' : 'theme-text-primary'}`}>
                                {remaining === 0 ? "Time's up" : mmss(remaining)}
                            </span>
                            <button type="button" className="px-2 py-1 rounded border theme-border" onClick={() => setRemaining(null)}>Clear</button>
                        </>
                    )}
                </div>
            )}

            {showHelp && (
                <div role="note" className="text-sm rounded-lg theme-bg-tertiary p-3">
                    <p className="font-semibold mb-1">Keyboard shortcuts</p>
                    <ul className="space-y-0.5 contrast-muted">
                        <li><kbd className="font-mono">→</kbd> next card · <kbd className="font-mono">←</kbd> previous card</li>
                        <li><kbd className="font-mono">S</kbd> stop scoring the current card</li>
                        <li><kbd className="font-mono">?</kbd> show/hide this help</li>
                    </ul>
                </div>
            )}
        </section>
    );
}
