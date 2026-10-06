// US48.12: accessible dialogs, in-app confirmations, merged reward feedback.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import { ConfirmProvider, useConfirm } from '../context/ConfirmContext';
import { Modal } from '../components/ui/Modal';

const handlers: Record<string, (data: unknown) => void> = {};
vi.mock('../lib/socket', () => ({
    socket: {
        on: (name: string, fn: (data: unknown) => void) => { handlers[name] = fn; },
        off: (name: string) => { delete handlers[name]; },
    },
}));
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({ toast: { success: (...args: unknown[]) => toastSuccess(...args), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe('Modal', () => {
    it('is a labelled dialog that closes on Escape and returns focus to the opener', async () => {
        function Harness() {
            const [open, setOpen] = React.useState(false);
            return (
                <>
                    <button onClick={() => setOpen(true)}>Open</button>
                    <Modal isOpen={open} onClose={() => setOpen(false)} title="Settings"><input aria-label="Name" /></Modal>
                </>
            );
        }
        render(<Harness />);
        const opener = screen.getByRole('button', { name: 'Open' });
        opener.focus();
        fireEvent.click(opener);

        const dialog = await screen.findByRole('dialog', { name: 'Settings' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();

        fireEvent.keyDown(document, { key: 'Escape' });
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(document.activeElement).toBe(opener);
    });
});

describe('useConfirm', () => {
    function Harness({ onResult }: { onResult: (value: unknown) => void }) {
        const confirm = useConfirm();
        return (
            <>
                <button onClick={async () => onResult(await confirm.ok({ title: 'Delete it?', message: 'Gone for good.' }))}>Ask</button>
                <button onClick={async () => onResult(await confirm.reason({ title: 'Reject?', message: 'Tell them why.', reasonLabel: 'Reason' }))}>Reject</button>
            </>
        );
    }
    const setup = () => {
        const onResult = vi.fn();
        render(<ThemeProvider><ConfirmProvider><Harness onResult={onResult} /></ConfirmProvider></ThemeProvider>);
        return onResult;
    };

    it('resolves true on confirm and false on cancel', async () => {
        const onResult = setup();
        fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
        expect(await screen.findByRole('alertdialog', { name: 'Delete it?' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));

        fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
        await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(true));
    });

    it('returns the typed reason, or null when cancelled (never acts on cancel)', async () => {
        const onResult = setup();
        fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
        fireEvent.change(await screen.findByLabelText('Reason'), { target: { value: '  duplicate account ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
        await waitFor(() => expect(onResult).toHaveBeenCalledWith('duplicate account'));

        fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
        fireEvent.keyDown(document, { key: 'Escape' });
        await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(null));
    });
});

describe('AchievementToast', () => {
    it('merges points and badges that arrive together into one toast', async () => {
        vi.useFakeTimers();
        const { AchievementToast } = await import('../components/gamification/AchievementToast');
        render(<AchievementToast participantId="p-1" />);
        act(() => {
            handlers['gamification:points_earned']({ participant_id: 'p-1', points: 10 });
            handlers['gamification:badge_unlocked']({ participant_id: 'p-1', badge_name: 'First idea' });
            handlers['gamification:points_earned']({ participant_id: 'someone-else', points: 99 });
            vi.advanceTimersByTime(1000);
        });
        expect(toastSuccess).toHaveBeenCalledTimes(1);
        expect(toastSuccess.mock.calls[0][0]).toBe('+10 points · Badge unlocked: First idea');
        vi.useRealTimers();
    });
});

