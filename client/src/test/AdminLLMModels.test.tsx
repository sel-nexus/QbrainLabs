import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from './test-utils';
import { AdminLLMModels } from '../pages/AdminLLMModels';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

global.fetch = vi.fn();

const mockModels = [
    {
        id: 'model-1',
        name: 'GPT-4 Reasoning',
        provider: 'openai',
        role: 'reasoning',
        model_name: 'gpt-4',
        config_json: {},
        has_api_key: true,
        is_active: true,
        created_by: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    },
];

describe('AdminLLMModels', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('hm_auth_token', 'test-token');
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockModels,
        });
    });

    it('should display the list of configured models', async () => {
        render(<AdminLLMModels />);
        await waitFor(() => {
            expect(screen.getByText('GPT-4 Reasoning')).toBeInTheDocument();
        });
        expect(screen.getByText('openai')).toBeInTheDocument();
        expect(screen.getByText('reasoning')).toBeInTheDocument();
    });

    it('should submit a new model config', async () => {
        render(<AdminLLMModels />);
        await waitFor(() => {
            expect(screen.getByText('GPT-4 Reasoning')).toBeInTheDocument();
        });

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ...mockModels[0], id: 'model-2', name: 'New Model' }),
        });

        fireEvent.click(screen.getByRole('button', { name: /add model/i }));
        fireEvent.change(screen.getByPlaceholderText(/reasoning model/i), {
            target: { value: 'New Model' },
        });
        fireEvent.change(screen.getByPlaceholderText(/e.g. gpt-4/i), {
            target: { value: 'gpt-4' },
        });
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalled();
        });
    });
});
