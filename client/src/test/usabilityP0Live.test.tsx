// US48 P0: the facilitator changing phase must not throw away a participant's
// draft, and the API client must surface real errors / session expiry.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { socket } from '../lib/socket';

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('../lib/api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../lib/api')>();
    return {
        ...actual,
        api: Object.assign(actual.api, {
            get: (...args: unknown[]) => mockGet(...args),
            post: (...args: unknown[]) => mockPost(...args),
        }),
    };
});
vi.mock('../lib/api/gamification', () => ({
    awardPoints: vi.fn().mockResolvedValue({ points_earned: 0, achievements_unlocked: [] }),
    getParticipantPoints: vi.fn().mockResolvedValue({ total_points: 0 }),
    getLeaderboard: vi.fn().mockResolvedValue([]),
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock('../context/SessionContext', () => ({
    useSession: () => ({
        session: { participantId: 'p-1', workshopId: 'w-1', name: 'Ann', role: 'PARTICIPANT' },
        isLoading: false, login: vi.fn(), logout: vi.fn(), updateRole: vi.fn(),
    }),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReset();
    mockPost.mockReset();
    mockGet.mockImplementation((url: string) => {
        if (url.startsWith('/session/')) {
            return Promise.resolve({ data: { workshop_id: 'w-1', workshop_title: 'AI Day', workshop_status: 'ACTIVE', current_phase: 'INTAKE', use_cases: [], surveys: [] } });
        }
        return Promise.resolve({ data: [] });
    });
});

const stateChangeHandler = () =>
    vi.mocked(socket.on).mock.calls.filter((c: unknown[]) => c[0] === 'workshop_state_change').pop()![1];

async function renderDashboard() {
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
    fireEvent.click(await screen.findByText('Submit Use Case'));
}

describe('Phase change while writing a use case', () => {
    it('keeps the participant in the form with a banner, then continues to scoring', async () => {
        await renderDashboard();
        fireEvent.change(screen.getByPlaceholderText('e.g. Automated Customer Support'), { target: { value: 'Half-written idea' } });

        act(() => stateChangeHandler()({ phase: 'SCORING' }));

        expect(screen.getByText('The facilitator has started scoring.')).toBeInTheDocument();
        expect(screen.queryByText('SCORING PAGE')).not.toBeInTheDocument();
        expect(screen.getByPlaceholderText('e.g. Automated Customer Support')).toHaveValue('Half-written idea');

        fireEvent.click(screen.getByRole('button', { name: /go to scoring now/i }));
        expect(await screen.findByText('SCORING PAGE')).toBeInTheDocument();
    });

    it('still moves straight to scoring when nothing is being written', async () => {
        await renderDashboard();
        act(() => stateChangeHandler()({ phase: 'SCORING' }));
        expect(await screen.findByText('SCORING PAGE')).toBeInTheDocument();
    });
});

describe('API client interceptor', () => {
    const rejected = async () => {
        const { api } = await import('../lib/api');
        return (api.interceptors.response as any).handlers[0].rejected as (e: unknown) => Promise<never>;
    };

    it('exposes the backend error envelope message as response.data.detail', async () => {
        const handler = await rejected();
        const error = { config: {}, response: { status: 409, data: { success: false, error: { message: 'Name taken' } } } };
        await expect(handler(error)).rejects.toBe(error);
        expect((error.response.data as any).detail).toBe('Name taken');
    });

    it('emits auth-expired on a 401 for the stored token, but not for login failures', async () => {
        const { AUTH_EXPIRED_EVENT } = await import('../lib/authEvents');
        vi.mocked(localStorage.getItem).mockImplementation((k: string) => (k === 'hm_auth_token' ? 'tok' : null));
        const listener = vi.fn();
        window.addEventListener(AUTH_EXPIRED_EVENT, listener);
        const handler = await rejected();

        await handler({ config: { url: 'auth/login', headers: { Authorization: 'Bearer tok' } }, response: { status: 401, data: {} } }).catch(() => undefined);
        expect(listener).not.toHaveBeenCalled();

        await handler({ config: { url: 'workshops/1', headers: { Authorization: 'Bearer tok' } }, response: { status: 401, data: {} } }).catch(() => undefined);
        await waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
        window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
    });
});
