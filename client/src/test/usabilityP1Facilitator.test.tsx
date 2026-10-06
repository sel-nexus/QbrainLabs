// US48.4–48.6: phase stepper, live progress, card control, presenter mode.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import { PhaseStepper } from '../components/facilitator/PhaseStepper';
import { LiveProgressPanel, ActiveCardControls } from '../components/facilitator/LiveProgress';
import { PresenterJoinView, PresenterResultsView } from '../components/facilitator/PresenterViews';
import { phaseLabel } from '../lib/workshopPhases';
import type { WorkshopProgress } from '../hooks/useWorkshopProgress';

vi.mock('../components/ResultsChart', () => ({ ResultsChart: () => <div data-testid="chart" /> }));

const progress: WorkshopProgress = {
    participants: 12, use_cases: 9, submitters: 7, scorers: 5,
    votes_by_use_case: { a: 4, b: 2 }, active_use_case_id: 'a', active_card_votes: 4,
};

const withTheme = (ui: React.ReactNode) => render(<ThemeProvider>{ui}</ThemeProvider>);

beforeEach(() => {
    vi.clearAllMocks();
});

describe('phaseLabel', () => {
    it('never shows raw codes', () => {
        expect(phaseLabel('INTAKE')).toBe('Capture ideas');
        expect(phaseLabel('SCORING')).toBe('Score');
        expect(phaseLabel('ANALYSIS')).toBe('Results');
        expect(phaseLabel('COMPLETED')).toBe('Complete');
        expect(phaseLabel(undefined)).toBe('Not started');
    });
});

describe('PhaseStepper', () => {
    it('highlights the current step and confirms before moving forward, showing readiness', async () => {
        const onSetPhase = vi.fn();
        withTheme(<PhaseStepper phase="INTAKE" completed={false} progress={progress} onSetPhase={onSetPhase} onSetCompleted={vi.fn()} />);
        expect(screen.getByText('Capture ideas').closest('[aria-current]')).toHaveAttribute('aria-current', 'step');
        expect(screen.queryByRole('button', { name: /back to/i })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /next: score/i }));
        expect(screen.getByText('Move everyone to scoring?')).toBeInTheDocument();
        expect(screen.getByText(/9 use cases captured from 7 of 12 participants/)).toBeInTheDocument();
        expect(onSetPhase).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Score' }));
        await waitFor(() => expect(onSetPhase).toHaveBeenCalledWith('SCORING'));
    });

    it('can go back a step and complete or reopen the workshop', async () => {
        const onSetPhase = vi.fn();
        const onSetCompleted = vi.fn();
        const { rerender } = withTheme(
            <PhaseStepper phase="ANALYSIS" completed={false} progress={progress} onSetPhase={onSetPhase} onSetCompleted={onSetCompleted} />
        );
        fireEvent.click(screen.getByRole('button', { name: 'Back to Score' }));
        // The confirmation dialog's confirm button carries the same label.
        fireEvent.click(screen.getAllByRole('button', { name: 'Back to Score' }).pop()!);
        await waitFor(() => expect(onSetPhase).toHaveBeenCalledWith('SCORING'));

        fireEvent.click(screen.getByRole('button', { name: /complete workshop/i }));
        fireEvent.click(screen.getAllByRole('button', { name: /complete workshop/i }).pop()!);
        await waitFor(() => expect(onSetCompleted).toHaveBeenCalledWith(true));

        rerender(
            <ThemeProvider>
                <PhaseStepper phase="ANALYSIS" completed={true} progress={progress} onSetPhase={onSetPhase} onSetCompleted={onSetCompleted} />
            </ThemeProvider>
        );
        expect(screen.getByText('Complete').closest('[aria-current]')).toHaveAttribute('aria-current', 'step');
        fireEvent.click(screen.getByRole('button', { name: 'Reopen workshop' }));
        fireEvent.click(screen.getAllByRole('button', { name: 'Reopen workshop' }).pop()!);
        await waitFor(() => expect(onSetCompleted).toHaveBeenCalledWith(false));
    });
});

describe('LiveProgressPanel', () => {
    it('shows joined / use cases / scored / waiting counts', () => {
        render(<LiveProgressPanel progress={progress} phase="SCORING" />);
        const panel = screen.getByRole('region', { name: 'Live progress' });
        expect(within(panel).getByText('Joined').nextSibling).toHaveTextContent('12');
        expect(within(panel).getByText('from 7 participants')).toBeInTheDocument();
        expect(within(panel).getByText('Not scored yet').nextSibling).toHaveTextContent('7');
    });
});

describe('ActiveCardControls', () => {
    const useCases = [{ id: 'a', title: 'Alpha' }, { id: 'b', title: 'Bravo' }, { id: 'c', title: 'Charlie' }];

    it('shows the live card, its vote count, and steps with buttons', () => {
        const onPresent = vi.fn();
        render(<ActiveCardControls useCases={useCases} activeCardId="a" progress={progress} onPresent={onPresent} />);
        expect(screen.getByText('Now scoring · card 1 of 3')).toBeInTheDocument();
        expect(screen.getByText('4 of 12 scored')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Previous card' })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: /next card/i }));
        expect(onPresent).toHaveBeenLastCalledWith('b');
        fireEvent.click(screen.getByRole('button', { name: /stop scoring/i }));
        expect(onPresent).toHaveBeenLastCalledWith(null);
    });

    it('supports keyboard shortcuts but ignores keys typed into fields', () => {
        const onPresent = vi.fn();
        render(
            <>
                <input aria-label="notes" />
                <ActiveCardControls useCases={useCases} activeCardId="b" progress={progress} onPresent={onPresent} />
            </>
        );
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        expect(onPresent).toHaveBeenLastCalledWith('c');
        fireEvent.keyDown(window, { key: 'ArrowLeft' });
        expect(onPresent).toHaveBeenLastCalledWith('a');
        fireEvent.keyDown(window, { key: 's' });
        expect(onPresent).toHaveBeenLastCalledWith(null);

        onPresent.mockClear();
        fireEvent.keyDown(screen.getByLabelText('notes'), { key: 'ArrowRight' });
        expect(onPresent).not.toHaveBeenCalled();

        fireEvent.keyDown(window, { key: '?' });
        expect(screen.getByText('Keyboard shortcuts')).toBeInTheDocument();
    });

    it('offers a countdown timer for the live card', () => {
        vi.useFakeTimers();
        render(<ActiveCardControls useCases={useCases} activeCardId="a" progress={progress} onPresent={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: '1 min' }));
        expect(screen.getByRole('timer')).toHaveTextContent('1:00');
        vi.useRealTimers();
    });

    it('prompts to present the first card when none is live', () => {
        const onPresent = vi.fn();
        render(<ActiveCardControls useCases={useCases} activeCardId={null} progress={progress} onPresent={onPresent} />);
        fireEvent.click(screen.getByRole('button', { name: /present first card/i }));
        expect(onPresent).toHaveBeenCalledWith('a');
    });
});

describe('Presenter mode', () => {
    it('shows a large join screen with the PIN and closes on Escape', () => {
        const onClose = vi.fn();
        render(<PresenterJoinView title="AI Day" pin="ABC123" joinUrl="https://app.example.com/join?pin=ABC123" onClose={onClose} />);
        expect(screen.getByRole('dialog', { name: 'Join this workshop' })).toBeInTheDocument();
        expect(screen.getByText('ABC123')).toBeInTheDocument();
        expect(screen.getByText('app.example.com/join')).toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });

    it('ranks results highest first', () => {
        render(
            <PresenterResultsView
                title="AI Day" xLabel="Feasibility" yLabel="Value" onClose={vi.fn()}
                results={[{ id: '1', title: 'Low', total_score: 10 }, { id: '2', title: 'High', total_score: 90 }, { id: '3', title: 'Mid', total_score: 50 }]}
            />
        );
        const items = within(screen.getByRole('list', { name: /top 3 use cases/i })).getAllByRole('listitem');
        expect(items.map((li) => li.textContent)).toEqual(['#1High90', '#2Mid50', '#3Low10']);
    });
});
