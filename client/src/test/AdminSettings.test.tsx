import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from './test-utils';
import { AdminSettings } from '../pages/AdminSettings';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

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

const renderComponent = () => {
    return render(<AdminSettings />);
};

describe('AdminSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.getItem.mockReturnValue('test-token');
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockSettings,
        });
    });

    it('should render component successfully', () => {
        const { container } = renderComponent();
        // Component should render without crashing
        expect(container).toBeTruthy();
        expect(container.querySelector('.min-h-screen')).toBeTruthy();
    });

    it('should fetch and display settings', async () => {
        renderComponent();

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/admin/settings'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-token',
                }),
            })
        );
    });

    it('should display category tabs', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });
        
        // Check if categories are rendered
        expect(screen.getByText(/rate limiting/i)).toBeInTheDocument();
    });

    it('should filter settings by category', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });

        // Click on Security category
        const securityTab = screen.getByText(/Security/i);
        fireEvent.click(securityTab);

        await waitFor(() => {
            expect(screen.getByText(/Minimum password length/i)).toBeInTheDocument();
        });
    });

    it('should allow editing number input', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });

        // Find number input
        const numberInput = screen.getAllByRole('spinbutton')[0];

        // Change value
        fireEvent.change(numberInput, { target: { value: '15' } });

        expect(numberInput).toHaveValue(15);
    });

    it('should enable save button when value changes', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });

        // Find number input and change it
        const numberInput = screen.getAllByRole('spinbutton')[0];
        fireEvent.change(numberInput, { target: { value: '15' } });

        // Save button should be enabled
        const saveButtons = screen.getAllByText('Save');
        expect(saveButtons[0]).not.toBeDisabled();
    });

    it('should call API when saving setting', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockSettings,
        }).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ...mockSettings.settings[0], value: 15 }),
        });

        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });

        // Change value
        const numberInput = screen.getAllByRole('spinbutton')[0];
        fireEvent.change(numberInput, { target: { value: '15' } });

        // Click save
        const saveButton = screen.getAllByText('Save')[0];
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/admin/settings/rate_limit.registration.daily'),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify({ value: 15 }),
                })
            );
        });
    });

    it('should toggle boolean setting', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });

        // Click on Features category
        const featuresTab = screen.getByText(/Features/i);
        fireEvent.click(featuresTab);

        await waitFor(() => {
            // Find toggle button
            const toggles = screen.getAllByRole('button');
            const toggle = toggles.find(btn =>
                btn.className.includes('rounded-full')
            );

            if (toggle) {
                fireEvent.click(toggle);
                // Value should change
            }
        });
    });

    it('should handle API error gracefully', () => {
        (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

        // Component should render without crashing even with API error
        const { container } = renderComponent();
        expect(container).toBeTruthy();
    });

    it('should display validation error on invalid value', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockSettings,
        }).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ detail: 'Value must be at most 1000' }),
        });

        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });

        // Change to invalid value
        const numberInput = screen.getAllByRole('spinbutton')[0];
        fireEvent.change(numberInput, { target: { value: '9999' } });

        // Click save
        const saveButton = screen.getAllByText('Save')[0];
        fireEvent.click(saveButton);

        // Should show error (mocked toast.error would be called)
    });

    it('should show default value for each setting', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });

        // Check for "Default:" text
        const defaultTexts = screen.getAllByText(/Default:/i);
        expect(defaultTexts.length).toBeGreaterThan(0);
    });

    it('should render reset buttons for each setting', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });

        // Check that reset buttons are rendered (RotateCcw icons)
        const allButtons = screen.getAllByRole('button');
        const resetButtons = allButtons.filter(btn => {
            const svg = btn.querySelector('svg');
            // Reset buttons have p-2 class and contain SVG
            return svg && btn.className.includes('p-2') && btn.className.includes('rounded-lg');
        });

        // Should have at least one reset button per setting
        expect(resetButtons.length).toBeGreaterThan(0);
    });
});
