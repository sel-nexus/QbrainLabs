// US48.8: participants always know what to do next.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';

const mockGet = vi.fn();
vi.mock('../lib/api', () => ({
    api: {
        get: (...args: unknown[]) => mockGet(...args),
        post: vi.fn().mockResolvedValue({ data: {} }),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    },
}));
vi.mock('../lib/api/gamification', () => ({
    awardPoints: vi.fn().mockResolvedValue({ points_earned: 0, achievements_unlocked: [] }),
    getParticipantPoints: vi.fn().mockResolvedValue({ total_points: 0 }),
    getLeaderboard: vi.fn().mockResolvedValue([]),
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
const logout = vi.fn();
const DEFAULT_SESSION = { participantId: 'p-me', workshopId: 'w-1', name: 'Ann', role: 'PARTICIPANT' };
let currentSession: typeof DEFAULT_SESSION | null = DEFAULT_SESSION;
vi.mock('../context/SessionContext', () => ({
    useSession: () => ({
        session: currentSession,
        isLoading: false, login: vi.fn(), logout, updateRole: vi.fn(),
    }),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function sessionInfo(phase: string, status = 'IN_PROGRESS', useCases: object[] = []) {
    return { workshop_id: 'w-1', workshop_title: 'AI Day', workshop_status: status, current_phase: phase, use_cases: useCases, surveys: [] };
}

async function renderDashboard(info: object) {
    mockGet.mockImplementation((url: string) => {
        if (url.startsWith('/session/')) return Promise.resolve({ data: info });
        if (url === 'results/w-1') {
            return Promise.resolve({ data: [{ id: 'x', title: 'Second', total_score: 40 }, { id: 'y', title: 'Winner', total_score: 80 }] });
        }
        return Promise.resolve({ data: [] });
    });
    const { ParticipantDashboard } = await import('../pages/ParticipantDashboard');
    render(
        <ThemeProvider>
            <AuthProvider>
                <MemoryRouter initialEntries={['/participant-dashboard']}>
                    <Routes>
                        <Route path="/participant-dashboard" element={<ParticipantDashboard />} />
                        <Route path="/scoring" element={<div>SCORING PAGE</div>} />
                    </Routes>
                </MemoryRouter>
            </AuthProvider>
        </ThemeProvider>
    );
    return screen.findByRole('region', { name: /./, hidden: false }).catch(() => null);
}

const banner = async () => {
    const title = await screen.findByRole('heading', { level: 2, name: /add your|score the|see the results|workshop is complete|waiting for/i });
    return title.closest('section')!;
};

beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReset();
    currentSession = DEFAULT_SESSION;
});

describe('What to do now banner', () => {
    it('intake: step 1 with an Add a use case action', async () => {
        await renderDashboard(sessionInfo('INTAKE'));
        const b = await banner();
        expect(within(b).getByText('Step 1 of 3')).toBeInTheDocument();
        expect(within(b).getByRole('heading', { name: 'Add your AI use case ideas' })).toBeInTheDocument();
        fireEvent.click(within(b).getByRole('button', { name: /add a use case/i }));
        expect(await screen.findByPlaceholderText('e.g. Automated Customer Support')).toBeInTheDocument();
        expect(screen.queryByText('INTAKE')).not.toBeInTheDocument();
        expect(screen.getAllByText('Capture ideas').length).toBeGreaterThan(0);
    });

    it('scoring: step 2 leads to the scoring page', async () => {
        await renderDashboard(sessionInfo('SCORING'));
        const b = await banner();
        expect(within(b).getByText('Step 2 of 3')).toBeInTheDocument();
        fireEvent.click(within(b).getByRole('button', { name: /go to scoring/i }));
        expect(await screen.findByText('SCORING PAGE')).toBeInTheDocument();
    });

    it('results: participants can see the top use cases', async () => {
        await renderDashboard(sessionInfo('ANALYSIS'));
        const b = await banner();
        fireEvent.click(within(b).getByRole('button', { name: /see top use cases/i }));
        const list = await screen.findByRole('list', { name: 'Top use cases' });
        const items = within(list).getAllByRole('listitem');
        expect(items[0]).toHaveTextContent('Winner');
        expect(items[1]).toHaveTextContent('Second');
    });

    it('complete: thanks participants', async () => {
        await renderDashboard(sessionInfo('ANALYSIS', 'COMPLETED'));
        const b = await banner();
        expect(within(b).getByRole('heading', { name: /workshop is complete/i })).toBeInTheDocument();
    });

    it('not started: tells participants to wait, with no action', async () => {
        await renderDashboard(sessionInfo('LOBBY'));
        const b = await banner();
        expect(within(b).getByRole('heading', { name: /waiting for the facilitator/i })).toBeInTheDocument();
        expect(within(b).queryByRole('button')).not.toBeInTheDocument();
    });
});

describe('My use cases', () => {
    it('marks and filters the participant’s own use cases', async () => {
        await renderDashboard(sessionInfo('INTAKE', 'IN_PROGRESS', [
            { id: 'u1', title: 'My chatbot', description: 'd', participant_id: 'p-me' },
            { id: 'u2', title: 'Their forecast', description: 'd', participant_id: 'p-other' },
        ]));
        const section = (await screen.findByText(/Workshop Use Cases/)).closest('div')!.parentElement!;
        expect(within(section).getByText('Mine · tap to edit')).toBeInTheDocument();
        fireEvent.click(within(section).getByRole('button', { name: 'Mine (1)' }));
        expect(within(section).queryByText('Their forecast')).not.toBeInTheDocument();
        expect(within(section).getByText('My chatbot')).toBeInTheDocument();
    });
});

describe('Join screen', () => {
    it('has visible labels and hides the facilitator request behind a host link', async () => {
        currentSession = null;
        const { JoinWorkshop } = await import('../pages/JoinWorkshop');
        render(
            <ThemeProvider>
                <MemoryRouter initialEntries={['/join']}>
                    <Routes><Route path="/join" element={<JoinWorkshop />} /></Routes>
                </MemoryRouter>
            </ThemeProvider>
        );
        expect(screen.getByLabelText('Workshop PIN (6 characters)')).toBeInTheDocument();
        expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
        expect(screen.queryByText('Request Facilitator Access')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /are you hosting this workshop/i }));
        expect(screen.getByText('Request Facilitator Access')).toBeInTheDocument();
    });
});

describe('Scoring page', () => {
    it('asks in-app before leaving the workshop', async () => {
        mockGet.mockResolvedValue({ data: { title: 'AI Day', active_use_case_id: null, config: { criteria: [] } } });
        const { ScoringPhase } = await import('../pages/ScoringPhase');
        render(
            <ThemeProvider>
                <MemoryRouter initialEntries={['/scoring']}>
                    <Routes><Route path="/scoring" element={<ScoringPhase />} /><Route path="/" element={<div>HOME</div>} /></Routes>
                </MemoryRouter>
            </ThemeProvider>
        );
        await screen.findByText(/wait for the facilitator/i);
        fireEvent.click(screen.getByRole('button', { name: /leave/i }));
        expect(screen.getByText('Leave the workshop?')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
        expect(logout).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: /leave/i }));
        fireEvent.click(screen.getByRole('button', { name: 'Leave workshop' }));
        expect(logout).toHaveBeenCalled();
    });
});
