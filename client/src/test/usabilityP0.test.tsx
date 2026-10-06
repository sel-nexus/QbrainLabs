// US48 P0: live-session reliability (lost work, scores, errors).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from './test-utils';
import { render as rtlRender } from '@testing-library/react';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { ScoringCard } from '../components/ScoringCard';
import { UseCaseForm } from '../components/UseCaseForm';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { socket } from '../lib/socket';

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('../lib/api', () => ({
    api: {
        get: (...args: unknown[]) => mockGet(...args),
        post: (...args: unknown[]) => mockPost(...args),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    },
}));
vi.mock('../lib/api/gamification', () => ({
    awardPoints: vi.fn().mockResolvedValue({ points_earned: 5, achievements_unlocked: [] }),
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));

function installMemoryStorage() {
    const store = new Map<string, string>();
    vi.mocked(localStorage.getItem).mockImplementation((k: string) => (store.get(k) ?? null));
    vi.mocked(localStorage.setItem).mockImplementation((k: string, v: string) => store.set(k, String(v)));
    vi.mocked(localStorage.removeItem).mockImplementation((k: string) => store.delete(k));
    return store;
}

beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReset();
    mockPost.mockReset();
});

describe('Button', () => {
    it('defaults to type="button" so it never submits a surrounding form by accident', () => {
        const onSubmit = vi.fn((e: Event) => e.preventDefault());
        rtlRender(
            <form onSubmit={onSubmit as any}>
                <Button>Browse Templates</Button>
                <Button type="submit">Create</Button>
            </form>
        );
        expect(screen.getByRole('button', { name: 'Browse Templates' })).toHaveAttribute('type', 'button');
        fireEvent.click(screen.getByRole('button', { name: 'Browse Templates' }));
        expect(onSubmit).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });
});

describe('ScoringCard', () => {
    const session = { participantId: 'p-1', workshopId: 'w-1' };
    const card = { id: 'uc-1', title: 'Invoice triage', description: 'Sort invoices' };
    const criteria = [{ name: 'Value' }, { name: 'Feasibility', description: 'How hard is it to build?' }];

    beforeEach(() => {
        mockGet.mockResolvedValue({ data: [] });
    });

    it('submits the displayed value for sliders the participant never moved', async () => {
        mockPost.mockResolvedValue({ data: {} });
        rtlRender(<ScoringCard session={session} activeCard={card} criteria={criteria} />);
        await waitFor(() => expect(mockGet).toHaveBeenCalled());

        fireEvent.change(screen.getByLabelText('Value'), { target: { value: '80' } });
        fireEvent.click(screen.getByRole('button', { name: 'Submit score' }));

        await waitFor(() => expect(mockPost).toHaveBeenCalledWith('votes/', {
            use_case_id: 'uc-1', participant_id: 'p-1', scores: { Value: 80, Feasibility: 50 },
        }));
        expect(await screen.findByText('Score recorded')).toBeInTheDocument();
    });

    it('shows criterion descriptions inline (not hover-only)', () => {
        rtlRender(<ScoringCard session={session} activeCard={card} criteria={criteria} />);
        expect(screen.getByText('How hard is it to build?')).toBeInTheDocument();
        expect(screen.getByLabelText('Feasibility')).toHaveAttribute('aria-describedby', 'score-1-desc');
    });

    it('reports a failed vote and lets the participant change a recorded score', async () => {
        mockPost.mockRejectedValueOnce({ response: { data: { error: { message: 'Voting is closed' } } } });
        rtlRender(<ScoringCard session={session} activeCard={card} criteria={criteria} />);
        fireEvent.click(screen.getByRole('button', { name: 'Submit score' }));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Voting is closed')));
        expect(screen.getByRole('button', { name: 'Submit score' })).toBeInTheDocument();

        mockPost.mockResolvedValueOnce({ data: {} });
        fireEvent.click(screen.getByRole('button', { name: 'Submit score' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Change my score' }));
        expect(screen.getByRole('button', { name: 'Submit score' })).toBeInTheDocument();
    });
});

describe('UseCaseForm drafts and failures', () => {
    const fillTitle = (value: string) =>
        fireEvent.change(screen.getByPlaceholderText('e.g. Automated Customer Support'), { target: { value } });
    // The form now validates required fields inline before submitting.
    const fillRequired = (title: string) => {
        fillTitle(title);
        fireEvent.change(screen.getByLabelText(/who has this problem/i), { target: { value: 'Agents' } });
        fireEvent.change(screen.getByLabelText(/what's the problem today/i), { target: { value: 'Slow lookups' } });
        fireEvent.change(screen.getByLabelText(/how would we measure success/i), { target: { value: 'Faster handling' } });
    };

    it('autosaves a draft and restores it when reopened', () => {
        const store = installMemoryStorage();
        const { unmount } = render(<UseCaseForm workshopId="w-1" onSubmit={vi.fn()} draftKey="draft-1" />);
        fillTitle('Claims summarizer');
        expect(JSON.parse(store.get('draft-1')!).title).toBe('Claims summarizer');
        unmount();

        render(<UseCaseForm workshopId="w-1" onSubmit={vi.fn()} draftKey="draft-1" />);
        expect(screen.getByPlaceholderText('e.g. Automated Customer Support')).toHaveValue('Claims summarizer');
        expect(screen.getByText('We restored your unsaved draft.')).toBeInTheDocument();
    });

    it('keeps the text and explains why when submission fails', async () => {
        const store = installMemoryStorage();
        mockPost.mockResolvedValue({ data: { is_duplicate: false } });
        const onSubmit = vi.fn().mockRejectedValue({ response: { data: { error: { message: 'Workshop is closed for new ideas' } } } });
        const { container } = render(<UseCaseForm workshopId="w-1" onSubmit={onSubmit} draftKey="draft-2" />);
        fillRequired('Contract review');
        fireEvent.submit(container.querySelector('form')!);

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Workshop is closed for new ideas')));
        expect(screen.getByPlaceholderText('e.g. Automated Customer Support')).toHaveValue('Contract review');
        expect(store.has('draft-2')).toBe(true);
    });

    it('clears the draft after a successful submit and reports dirty state', async () => {
        const store = installMemoryStorage();
        mockPost.mockResolvedValue({ data: { is_duplicate: false } });
        const onDirty = vi.fn();
        const { container } = render(
            <UseCaseForm workshopId="w-1" onSubmit={vi.fn().mockResolvedValue(undefined)} draftKey="draft-3" onDirtyChange={onDirty} />
        );
        fillRequired('Forecasting');
        expect(onDirty).toHaveBeenLastCalledWith(true);
        fireEvent.submit(container.querySelector('form')!);
        await waitFor(() => expect(store.has('draft-3')).toBe(false));
        expect(onDirty).toHaveBeenLastCalledWith(false);
    });
});

describe('ConnectionBanner', () => {
    const handlers = () => {
        const on = socket.on as any;
        const find = (event: string) => on.mock.calls.filter((c: unknown[]) => c[0] === event).pop()?.[1];
        return { connect: find('connect'), disconnect: find('disconnect') };
    };

    it('shows while the connection is lost and hides when it returns', () => {
        rtlRender(<ConnectionBanner />);
        expect(screen.queryByText(/reconnecting/i)).not.toBeInTheDocument();
        const h = handlers();
        act(() => h.connect());
        act(() => h.disconnect('transport close'));
        expect(screen.getByText(/connection lost — reconnecting/i)).toBeInTheDocument();
        act(() => h.connect());
        expect(screen.queryByText(/reconnecting/i)).not.toBeInTheDocument();
    });

    it('does not show after a deliberate disconnect (participant left)', () => {
        rtlRender(<ConnectionBanner />);
        const h = handlers();
        act(() => h.connect());
        act(() => h.disconnect('io client disconnect'));
        expect(screen.queryByText(/reconnecting/i)).not.toBeInTheDocument();
    });
});
