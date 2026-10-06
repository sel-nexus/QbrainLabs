// US48 P0: page-level recovery (rejoin mid-scoring, QR for another workshop,
// identity resume, session expiry, error envelope).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { ScoringPhase } from '../pages/ScoringPhase';
import { JoinWorkshop } from '../pages/JoinWorkshop';
import { apiErrorText, errorMessage } from '../lib/apiErrors';

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('../lib/api', () => ({
    api: {
        get: (...args: unknown[]) => mockGet(...args),
        post: (...args: unknown[]) => mockPost(...args),
    },
}));
vi.mock('../lib/api/gamification', () => ({ awardPoints: vi.fn().mockResolvedValue({ points_earned: 0, achievements_unlocked: [] }) }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));

const sessionState: { session: any; login: any; logout: any } = { session: null, login: vi.fn(), logout: vi.fn() };
vi.mock('../context/SessionContext', () => ({
    useSession: () => ({ ...sessionState, isLoading: false, updateRole: vi.fn() }),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function renderAt(path: string, element: React.ReactNode, routePath: string) {
    return render(
        <ThemeProvider>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path={routePath} element={element} />
                    <Route path="/participant-dashboard" element={<div>DASHBOARD</div>} />
                </Routes>
            </MemoryRouter>
        </ThemeProvider>
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReset();
    mockPost.mockReset();
    sessionState.session = null;
});

describe('ScoringPhase', () => {
    it('shows the card that is already live when a participant rejoins mid-vote', async () => {
        sessionState.session = { participantId: 'p-1', workshopId: 'w-1', name: 'Ann', role: 'PARTICIPANT' };
        mockGet.mockImplementation((url: string) => {
            if (url === '/workshops/w-1') return Promise.resolve({ data: { title: 'AI Day', active_use_case_id: 'uc-2', config: { criteria: [{ name: 'Value' }] } } });
            if (url === '/usecases/w-1') return Promise.resolve({ data: [{ id: 'uc-1', title: 'Other' }, { id: 'uc-2', title: 'Invoice triage', description: 'd' }] });
            return Promise.resolve({ data: [] });
        });
        renderAt('/scoring', <ScoringPhase />, '/scoring');
        expect(await screen.findByText('Invoice triage')).toBeInTheDocument();
        expect(screen.queryByText(/wait for the facilitator/i)).not.toBeInTheDocument();
    });

    it('shows a retry panel instead of loading forever when the workshop fails to load', async () => {
        sessionState.session = { participantId: 'p-1', workshopId: 'w-1', name: 'Ann', role: 'PARTICIPANT' };
        mockGet.mockRejectedValueOnce({ response: { status: 500, data: { error: { message: 'Database unavailable' } } } });
        renderAt('/scoring', <ScoringPhase />, '/scoring');
        expect(await screen.findByText('Database unavailable')).toBeInTheDocument();

        mockGet.mockResolvedValue({ data: { title: 'AI Day', active_use_case_id: null, config: { criteria: [] } } });
        fireEvent.click(screen.getByRole('button', { name: /retry/i }));
        expect(await screen.findByText(/wait for the facilitator/i)).toBeInTheDocument();
    });
});

describe('JoinWorkshop with an existing session', () => {
    beforeEach(() => {
        sessionState.session = { participantId: 'p-old', workshopId: 'w-old', name: 'Ann', role: 'PARTICIPANT' };
    });

    it('asks before leaving when the link is for a different workshop', async () => {
        mockGet.mockResolvedValue({ data: { pin: 'OLD123', title: 'Yesterday Workshop' } });
        renderAt('/join?pin=new999', <JoinWorkshop />, '/join');
        expect(await screen.findByText(/You're still in “Yesterday Workshop”/)).toBeInTheDocument();
        expect(screen.queryByText('DASHBOARD')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Leave and join this workshop' }));
        expect(sessionState.logout).toHaveBeenCalled();
    });

    it('goes back to the dashboard when the link is for the same workshop', async () => {
        mockGet.mockResolvedValue({ data: { pin: 'OLD123', title: 'Yesterday Workshop' } });
        renderAt('/join?pin=old123', <JoinWorkshop />, '/join');
        expect(await screen.findByText('DASHBOARD')).toBeInTheDocument();
    });

    it('goes back to the dashboard when there is no PIN in the link', async () => {
        renderAt('/join', <JoinWorkshop />, '/join');
        expect(await screen.findByText('DASHBOARD')).toBeInTheDocument();
        expect(mockGet).not.toHaveBeenCalled();
    });
});

describe('JoinWorkshop identity resume', () => {
    it('sends participant ids used on this device and remembers the new one', async () => {
        const store = new Map<string, string>([['hm_known_participants', JSON.stringify(['p-earlier'])]]);
        vi.mocked(localStorage.getItem).mockImplementation((k: string) => (store.get(k) ?? null));
        vi.mocked(localStorage.setItem).mockImplementation((k: string, v: string) => store.set(k, v));
        mockPost.mockResolvedValue({ data: { participant_id: 'p-earlier', workshop_id: 'w-1', role: 'PARTICIPANT' } });

        renderAt('/join?pin=abc123', <JoinWorkshop />, '/join');
        fireEvent.change(screen.getByPlaceholderText('Your Name'), { target: { value: 'Ann' } });
        fireEvent.click(screen.getByRole('button', { name: /join/i }));

        await waitFor(() => expect(mockPost).toHaveBeenCalledWith('join', expect.objectContaining({
            pin: 'ABC123', display_name: 'Ann', resume_participant_ids: ['p-earlier'],
        })));
        expect(JSON.parse(store.get('hm_known_participants')!)[0]).toBe('p-earlier');
        expect(sessionState.login).toHaveBeenCalledWith(expect.objectContaining({ participantId: 'p-earlier' }));
    });
});

describe('API error messages', () => {
    it('reads the backend envelope, FastAPI detail and validation errors', () => {
        expect(apiErrorText({ success: false, error: { code: 'CONFLICT', message: 'Name taken' } })).toBe('Name taken');
        expect(apiErrorText({ detail: 'Workshop not found. Check the PIN.' })).toBe('Workshop not found. Check the PIN.');
        expect(apiErrorText({ detail: [{ msg: 'field required' }] })).toBe('field required');
        expect(apiErrorText({
            error: { message: 'Request validation failed', details: { errors: [{ field: 'body.display_name', message: 'Value error, Name is required' }] } },
        })).toBe('display_name: Name is required');
        expect(apiErrorText(null)).toBe('');
    });

    it('prefers network diagnostics, then the server reason, then the fallback', () => {
        expect(errorMessage({ networkError: { message: 'Cannot connect to server' } })).toBe('Cannot connect to server');
        expect(errorMessage({ response: { data: { error: { message: 'Voting closed' } } } })).toBe('Voting closed');
        expect(errorMessage({ response: { data: {} }, message: 'Request failed with status code 500' }, 'Try again')).toBe('Try again');
    });
});

describe('Session expiry', () => {
    it('AuthContext signs the user out when an API call reports the token expired', async () => {
        vi.resetModules();
        vi.doUnmock('../context/SessionContext');
        const { AuthProvider, useAuth } = await import('../context/AuthContext');
        const { AUTH_EXPIRED_EVENT } = await import('../lib/authEvents');
        const store = new Map<string, string>([
            ['hm_auth_token', 'tok'],
            ['hm_user', JSON.stringify({ id: 'u1', email: 'a@b.c', role: 'facilitator', is_admin: false })],
        ]);
        vi.mocked(localStorage.getItem).mockImplementation((k: string) => (store.get(k) ?? null));
        vi.mocked(localStorage.removeItem).mockImplementation((k: string) => store.delete(k));
        global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }) as any;

        function Probe() {
            const { isAuthenticated } = useAuth();
            return <div>{isAuthenticated ? 'SIGNED_IN' : 'SIGNED_OUT'}</div>;
        }
        render(<AuthProvider><Probe /></AuthProvider>);
        await screen.findByText('SIGNED_IN');

        act(() => { window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT)); });
        expect(await screen.findByText('SIGNED_OUT')).toBeInTheDocument();
        expect(store.has('hm_auth_token')).toBe(false);
    });
});
