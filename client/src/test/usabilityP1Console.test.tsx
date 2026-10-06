// US48.4/48.5/48.6 integrated in the facilitator console (WorkshopDetail).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { SessionProvider } from '../context/SessionContext';
import { ConfirmProvider } from '../context/ConfirmContext';
import { socket } from '../lib/socket';

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('../lib/api', () => ({
    api: {
        get: (...args: unknown[]) => mockGet(...args),
        post: (...args: unknown[]) => mockPost(...args),
        put: vi.fn(), patch: vi.fn(), delete: vi.fn(),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    },
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ hasRole: () => true, user: { id: 'u1', is_admin: true }, isAuthenticated: true }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../components/WorkshopInsights', () => ({ WorkshopInsights: () => null }));
vi.mock('../components/MatrixActivityDashboard', () => ({ MatrixActivityDashboard: () => null }));
vi.mock('../components/ResultsChart', () => ({ ResultsChart: () => <div data-testid="chart" /> }));

const useCases = [
    { id: 'a', title: 'Alpha', description: 'first' },
    { id: 'b', title: 'Bravo', description: 'second' },
];

function setup(phase: string, status = 'IN_PROGRESS', active: string | null = null) {
    mockGet.mockImplementation((url: string) => {
        if (url === 'workshops/w-1') {
            return Promise.resolve({ data: { id: 'w-1', title: 'AI Day', pin: 'ABC123', status, current_phase: phase, active_use_case_id: active, config: { criteria: [{ name: 'Feasibility' }, { name: 'Value' }] } } });
        }
        if (url === 'workshops/w-1/progress') {
            return Promise.resolve({ data: { participants: 12, use_cases: 2, submitters: 2, scorers: 3, votes_by_use_case: { a: 3 }, active_use_case_id: active, active_card_votes: 3 } });
        }
        if (url === 'usecases/w-1') return Promise.resolve({ data: useCases });
        if (url === 'results/w-1') return Promise.resolve({ data: [{ id: 'a', title: 'Alpha', total_score: 70, scores: {} }] });
        return Promise.resolve({ data: [] });
    });
    mockPost.mockResolvedValue({ data: { status: 'IN_PROGRESS' } });
}

async function renderConsole(path = '/workshop/w-1') {
    const { WorkshopDetail } = await import('../pages/WorkshopDetail');
    render(
        <ThemeProvider>
            <ConfirmProvider>
                <SessionProvider>
                    <MemoryRouter initialEntries={[path]}>
                        <Routes><Route path="/workshop/:id" element={<WorkshopDetail />} /></Routes>
                    </MemoryRouter>
                </SessionProvider>
            </ConfirmProvider>
        </ThemeProvider>
    );
    await screen.findByRole('heading', { name: 'AI Day' });
}

const socketHandler = (event: string) =>
    vi.mocked(socket.on).mock.calls.filter((c: unknown[]) => c[0] === event).pop()![1] as (d: unknown) => void;

beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReset();
    mockPost.mockReset();
});

describe('Facilitator console', () => {
    it('capture phase: stepper, live counts and friendly phase names (no raw codes)', async () => {
        setup('INTAKE');
        await renderConsole();
        expect(screen.getByRole('navigation', { name: 'Workshop steps' })).toBeInTheDocument();
        const panel = await screen.findByRole('region', { name: 'Live progress' });
        expect(within(panel).getByText('Joined').nextSibling).toHaveTextContent('12');
        expect(screen.queryByText('INTAKE')).not.toBeInTheDocument();
        expect(screen.getAllByText('Capture ideas').length).toBeGreaterThan(0);

        // Moving forward is confirmed first, then calls the API.
        fireEvent.click(screen.getByRole('button', { name: /next: score/i }));
        expect(mockPost).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Score' }));
        await waitFor(() => expect(mockPost).toHaveBeenCalledWith('workshops/w-1/phase', { phase: 'SCORING' }));
    });

    it('scoring phase: card controls present the next card and stop scoring', async () => {
        setup('SCORING', 'IN_PROGRESS', 'a');
        await renderConsole();
        expect(await screen.findByText('Now scoring · card 1 of 2')).toBeInTheDocument();
        expect(await screen.findByText('3 of 12 scored')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /next card/i }));
        await waitFor(() => expect(mockPost).toHaveBeenCalledWith('workshops/w-1/active_card', { use_case_id: 'b' }));

        act(() => socketHandler('active_card_update')({ active_card: null }));
        expect(await screen.findByText('No card being scored')).toBeInTheDocument();
    });

    it('new ideas show as a badge on the Use Cases tab instead of a toast each', async () => {
        const { toast } = await import('sonner');
        setup('INTAKE');
        await renderConsole();
        fireEvent.click(screen.getByRole('button', { name: /polls/i }));
        act(() => socketHandler('new_submission')({ id: 'c', title: 'Charlie', description: 'x' }));
        act(() => socketHandler('new_submission')({ id: 'd', title: 'Delta', description: 'y' }));
        expect(screen.getByLabelText('2 new use cases')).toHaveTextContent('+2');
        expect(toast.info).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /use cases/i }));
        expect(screen.queryByLabelText(/new use cases/)).not.toBeInTheDocument();
    });

    it('results phase: tools stay reachable and results can be presented full screen', async () => {
        setup('ANALYSIS');
        await renderConsole();
        fireEvent.click(screen.getByRole('tab', { name: /workshop tools/i }));
        expect(screen.getByRole('button', { name: /polls/i })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: /results/i }));
        fireEvent.click(screen.getByRole('button', { name: /present results/i }));
        expect(screen.getByRole('dialog', { name: 'Workshop results' })).toBeInTheDocument();
    });

    it('completed workshops show Complete and can be reopened', async () => {
        setup('ANALYSIS', 'COMPLETED');
        await renderConsole();
        expect(screen.getByRole('button', { name: 'Reopen workshop' })).toBeInTheDocument();
    });

    it('right after creation shows a share-this-PIN panel that can be dismissed', async () => {
        setup('INTAKE');
        await renderConsole('/workshop/w-1?created=1');
        const panel = screen.getByRole('status', { name: 'Workshop created' });
        expect(within(panel).getByText('ABC123')).toBeInTheDocument();
        fireEvent.click(within(panel).getByRole('button', { name: /present join screen/i }));
        expect(screen.getByRole('dialog', { name: 'Join this workshop' })).toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'Escape' });
        fireEvent.click(within(screen.getByRole('status', { name: 'Workshop created' })).getByRole('button', { name: 'Dismiss' }));
        expect(screen.queryByRole('status', { name: 'Workshop created' })).not.toBeInTheDocument();
    });
});
