import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from './test-utils';
import { AdminSettings } from '../pages/AdminSettings';
import { toast } from 'sonner';

// Mock sonner
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

const mockSettings = {
    settings: [
        {
            id: '1',
            key: 'rate_limit.registration.daily',
            value: 10,
            value_type: 'number',
            default_value: 10,
            category: 'rate_limiting',
            description: 'Daily registration limit',
            is_sensitive: false,
            validation_rules: { min: 1, max: 1000 },
        },
        {
            id: '2',
            key: 'security.password.min_length',
            value: 8,
            value_type: 'number',
            default_value: 8,
            category: 'security',
            description: 'Minimum password length',
            is_sensitive: false,
            validation_rules: { min: 6, max: 128 },
        },
        {
            id: '3',
            key: 'features.ai_enhancement',
            value: true,
            value_type: 'boolean',
            default_value: true,
            category: 'features',
            description: 'Enable AI enhancement',
            is_sensitive: false,
        },
    ],
    categories: ['rate_limiting', 'security', 'features'],
};

describe('AdminSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.setItem('hm_auth_token', 'test-token');
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => JSON.parse(JSON.stringify(mockSettings)),
        });
    });

    it('should render component successfully', async () => {
        render(<AdminSettings />);
        const title = await screen.findByRole('heading', { name: /System Settings/i });
        expect(title).toBeInTheDocument();
    });

    it('should display settings after loading', async () => {
        render(<AdminSettings />);
        const settingLabel = await screen.findByText(/Daily registration limit/i);
        expect(settingLabel).toBeInTheDocument();
    });

    it('should allow editing number input', async () => {
        render(<AdminSettings />);
        const input = await screen.findByRole('spinbutton');
        fireEvent.change(input, { target: { value: '15' } });
        expect(input).toHaveValue(15);
    });

    it('should enable save button when value changes', async () => {
        render(<AdminSettings />);
        const input = await screen.findByRole('spinbutton');
        fireEvent.change(input, { target: { value: '15' } });

        const saveBtn = await screen.findByRole('button', { name: /save/i });
        expect(saveBtn).not.toBeDisabled();
    });

    it('should call API when saving setting', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => JSON.parse(JSON.stringify(mockSettings)),
        }).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ...mockSettings.settings[0], value: 15 }),
        });

        render(<AdminSettings />);
        const input = await screen.findByRole('spinbutton');
        fireEvent.change(input, { target: { value: '15' } });

        const saveBtn = await screen.findByRole('button', { name: /save/i });
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/admin/settings/rate_limit.registration.daily'),
                expect.objectContaining({ method: 'PUT' })
            );
        });
    });

    it('should display validation error on invalid value', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => JSON.parse(JSON.stringify(mockSettings)),
        }).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ detail: 'Value must be at most 1000' }),
        });

        render(<AdminSettings />);
        const input = await screen.findByRole('spinbutton');
        fireEvent.change(input, { target: { value: '9999' } });

        const saveBtn = await screen.findByRole('button', { name: /save/i });
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalled();
        }, { timeout: 3000 });
    });
});
