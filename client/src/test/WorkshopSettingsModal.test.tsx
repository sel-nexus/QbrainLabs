import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from './test-utils';
import { WorkshopSettingsModal } from '../components/WorkshopSettingsModal';

const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockPut = vi.fn();

vi.mock('../lib/api', () => ({
    api: {
        get: (...args: any[]) => mockGet(...args),
        patch: (...args: any[]) => mockPatch(...args),
        put: (...args: any[]) => mockPut(...args),
    },
}));

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

const mockRegistry = [
    { id: 'reason-1', name: 'GPT-4 Reasoning', provider: 'openai', role: 'reasoning', model_name: 'gpt-4', config_json: {}, has_api_key: true, is_active: true },
    { id: 'decide-1', name: 'JEV Decision', provider: 'typesafe_ai', role: 'decision', model_name: 'jev-v1', config_json: {}, has_api_key: false, is_active: true },
];

describe('WorkshopSettingsModal AI Models section', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGet.mockImplementation((url: string) => {
            if (url === 'admin/llm-models') {
                return Promise.resolve({ data: mockRegistry });
            }
            if (url.includes('llm-models')) {
                return Promise.resolve({ data: { embedding_model_id: null, decision_model_id: null, reasoning_model_id: null } });
            }
            return Promise.resolve({ data: {} });
        });
    });

    it('only lists reasoning-role models in the Reasoning dropdown', async () => {
        render(
            <WorkshopSettingsModal
                isOpen={true}
                onClose={() => {}}
                workshop={{ id: 'ws-1', title: 'Test Workshop' }}
                onUpdate={() => {}}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('GPT-4 Reasoning')).toBeInTheDocument();
        });

        const reasoningSelect = screen.getByLabelText(/reasoning model/i) as HTMLSelectElement;
        const optionLabels = Array.from(reasoningSelect.options).map((o) => o.textContent);
        expect(optionLabels).toContain('GPT-4 Reasoning');
        expect(optionLabels).not.toContain('JEV Decision');
    });
});
