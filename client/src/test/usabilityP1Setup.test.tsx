// US48.7 setup, US48.9 use case form, US48.10 scoring clarity.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { ThemeProvider } from '../context/ThemeContext';
import { distributeEvenly, matrixAxes, validateCriteria, type Criterion, type CriteriaAxes } from '../lib/criteria';
import { CriteriaEditor } from '../components/workshop/CriteriaEditor';
import { CreateWorkshop } from '../pages/CreateWorkshop';
import { UseCaseForm } from '../components/UseCaseForm';
import { UseCaseDetailModal } from '../components/usecases/UseCaseDetailModal';
import { ScoringCard } from '../components/ScoringCard';
import { WorkshopSettingsModal } from '../components/WorkshopSettingsModal';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
vi.mock('../lib/api', () => ({
    api: {
        get: (...a: unknown[]) => mockGet(...a),
        post: (...a: unknown[]) => mockPost(...a),
        put: (...a: unknown[]) => mockPut(...a),
        patch: (...a: unknown[]) => mockPatch(...a),
        delete: (...a: unknown[]) => mockDelete(...a),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    },
}));
vi.mock('../lib/api/gamification', () => ({ awardPoints: vi.fn().mockResolvedValue({ points_earned: 0, achievements_unlocked: [] }) }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock('../components/templates/TemplateSelector', () => ({
    TemplateSelector: ({ onSelectTemplate }: { onSelectTemplate: (t: { name: string; criteria: Criterion[] }) => void }) => (
        <button type="button" onClick={() => onSelectTemplate({ name: 'Library Template', criteria: [{ name: 'Speed', weight: 100 }] })}>
            Browse Templates
        </button>
    ),
}));

const withTheme = (ui: React.ReactNode) => render(<ThemeProvider>{ui}</ThemeProvider>);

beforeEach(() => {
    vi.clearAllMocks();
    [mockGet, mockPost, mockPut, mockPatch, mockDelete].forEach((m) => m.mockReset());
    mockGet.mockResolvedValue({ data: [] });
});

describe('criteria helpers', () => {
    it('distributes weights to exactly 100', () => {
        const three = distributeEvenly([{ name: 'a', weight: 0 }, { name: 'b', weight: 0 }, { name: 'c', weight: 0 }]);
        expect(three.map((c) => c.weight)).toEqual([34, 33, 33]);
        expect(distributeEvenly([{ name: 'a', weight: 5 }, { name: 'b', weight: 5 }]).map((c) => c.weight)).toEqual([50, 50]);
    });

    it('validates names, totals and axes', () => {
        const errors = validateCriteria([{ name: '', weight: 50 }, { name: 'X', weight: 40 }, { name: 'x', weight: 0 }], { x_axis: 'X', y_axis: 'X' });
        expect(Object.keys(errors).sort()).toEqual(['axes', 'name-0', 'name-2', 'weight']);
    });

    it('uses explicit axes before keyword inference', () => {
        expect(matrixAxes(['Reach', 'Cost'], { x_axis: 'Cost', y_axis: 'Reach' })).toEqual({ xLabel: 'Cost', yLabel: 'Reach' });
        expect(matrixAxes(['Feasibility', 'Business Value'])).toEqual({ xLabel: 'Feasibility', yLabel: 'Business Value' });
    });
});

function EditorHarness({ initial }: { initial: Criterion[] }) {
    const [criteria, setCriteria] = useState(initial);
    const [axes, setAxes] = useState<CriteriaAxes>({ x_axis: null, y_axis: null });
    return (
        <>
            <CriteriaEditor criteria={criteria} onChange={setCriteria} axes={axes} onAxesChange={setAxes} showErrors />
            <output data-testid="axes">{JSON.stringify(axes)}</output>
        </>
    );
}

describe('CriteriaEditor', () => {
    it('balances weights, rebalances on add, and keeps axes on rename', () => {
        withTheme(<EditorHarness initial={[{ name: 'Value', weight: 70 }, { name: 'Ease', weight: 10 }]} />);
        expect(screen.getByText('Weights must add up to 100% (currently 80%)')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /distribute evenly/i }));
        expect(screen.getByText('Total: 100%')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /add criterion/i }));
        expect(screen.getByText('Total: 100%')).toBeInTheDocument();
        expect(screen.getByText('Give this criterion a name')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Horizontal axis (X)'), { target: { value: 'Ease' } });
        fireEvent.change(screen.getByLabelText('Vertical axis (Y)'), { target: { value: 'Value' } });
        fireEvent.change(screen.getByLabelText('Criterion 2 name'), { target: { value: 'Ease of delivery' } });
        expect(JSON.parse(screen.getByTestId('axes').textContent!)).toEqual({ x_axis: 'Ease of delivery', y_axis: 'Value' });
    });
});

describe('CreateWorkshop', () => {
    const renderCreate = () => withTheme(
        <MemoryRouter initialEntries={['/facilitator/create']}>
            <Routes>
                <Route path="/facilitator/create" element={<CreateWorkshop />} />
                <Route path="/workshop/:id" element={<div>CONSOLE</div>} />
            </Routes>
        </MemoryRouter>
    );

    it('uses plain template names and shows inline errors instead of a disabled button', () => {
        renderCreate();
        expect(screen.getByRole('radio', { name: /simple: value vs\. feasibility/i })).toBeInTheDocument();
        expect(screen.queryByText(/US10/)).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Create Workshop' }));
        expect(screen.getByText('Give the workshop a title')).toBeInTheDocument();
        expect(mockPost).not.toHaveBeenCalled();
    });

    it('asks before replacing edited criteria and never overwrites a typed title', () => {
        renderCreate();
        fireEvent.change(screen.getByLabelText('Workshop title *'), { target: { value: 'My session' } });
        fireEvent.change(screen.getByLabelText('Criterion 1 name'), { target: { value: 'Speed to market' } });

        fireEvent.click(screen.getByRole('radio', { name: /comprehensive/i }));
        expect(screen.getByText('Replace your criteria?')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }));
        expect(screen.getByLabelText('Criterion 1 name')).toHaveValue('Speed to market');

        fireEvent.click(screen.getByRole('button', { name: 'Browse Templates' }));
        fireEvent.click(screen.getByRole('button', { name: 'Replace criteria' }));
        expect(screen.getByLabelText('Criterion 1 name')).toHaveValue('Speed');
        expect(screen.getByLabelText('Workshop title *')).toHaveValue('My session');
    });

    it('creates with chosen axes and lands on the new console', async () => {
        mockPost.mockResolvedValue({ data: { id: 'new-ws' } });
        renderCreate();
        fireEvent.change(screen.getByLabelText('Workshop title *'), { target: { value: ' AI Day ' } });
        fireEvent.change(screen.getByLabelText('Horizontal axis (X)'), { target: { value: 'Feasibility' } });
        fireEvent.change(screen.getByLabelText('Vertical axis (Y)'), { target: { value: 'Business Value' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create Workshop' }));
        expect(await screen.findByText('CONSOLE')).toBeInTheDocument();
        expect(mockPost).toHaveBeenCalledWith('workshops/', expect.objectContaining({
            title: 'AI Day',
            config: expect.objectContaining({ x_axis: 'Feasibility', y_axis: 'Business Value', template_id: null }),
        }));
    });
});

describe('WorkshopSettingsModal', () => {
    const base = { id: 'ws-1', title: 'AI Day', config: { criteria: [{ name: 'Feasibility', weight: 50 }, { name: 'Business Value', weight: 50 }] } };

    it('lets facilitators edit criteria during intake and keeps AI models under Advanced', async () => {
        mockPatch.mockResolvedValue({ data: {} });
        mockPut.mockResolvedValue({ data: {} });
        mockGet.mockResolvedValue({ data: [] });
        withTheme(<WorkshopSettingsModal isOpen onClose={vi.fn()} workshop={{ ...base, current_phase: 'INTAKE' }} onUpdate={vi.fn()} />);
        const advanced = screen.getByText('Advanced: AI models').closest('details')!;
        expect(advanced).not.toHaveAttribute('open');

        fireEvent.click(screen.getByRole('button', { name: /distribute evenly/i }));
        fireEvent.change(screen.getByLabelText('Criterion 1 weight (percent)'), { target: { value: '60' } });
        fireEvent.change(screen.getByLabelText('Criterion 2 weight (percent)'), { target: { value: '40' } });
        fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
        await waitFor(() => expect(mockPut).toHaveBeenCalledWith('workshops/ws-1/criteria', expect.objectContaining({
            criteria: [{ name: 'Feasibility', weight: 60 }, { name: 'Business Value', weight: 40 }],
        })));
    });

    it('shows criteria read-only once scoring has started', () => {
        withTheme(<WorkshopSettingsModal isOpen onClose={vi.fn()} workshop={{ ...base, current_phase: 'SCORING' }} onUpdate={vi.fn()} />);
        expect(screen.getByText(/criteria are locked once scoring has started/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /distribute evenly/i })).not.toBeInTheDocument();
    });
});

describe('UseCaseForm', () => {
    const renderForm = (onSubmit = vi.fn().mockResolvedValue(undefined)) => {
        const view = withTheme(<UseCaseForm workshopId="w-1" onSubmit={onSubmit} />);
        return { onSubmit, ...view };
    };

    it('uses plain-language labels, an optional AI type and shows inline required errors', async () => {
        const { onSubmit } = renderForm();
        expect(screen.getByLabelText(/who has this problem/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/how could ai help/i)).toBeInTheDocument();
        expect((screen.getByLabelText(/type of ai/i) as HTMLSelectElement).value).toBe('');
        expect(screen.getByRole('option', { name: 'Not sure' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Submit use case' }));
        expect(await screen.findAllByText('Please fill this in')).toHaveLength(4);
        expect(screen.getByLabelText(/give your idea a short name/i)).toHaveAttribute('aria-invalid', 'true');
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows examples and character counters', () => {
        renderForm();
        fireEvent.change(screen.getByLabelText(/what's the problem today/i), { target: { value: 'abc' } });
        expect(screen.getByText('3/2000')).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole('button', { name: 'See an example' })[1]);
        expect(screen.getByText(/spend about 6 minutes per ticket/)).toBeInTheDocument();
    });

    it('offers AI suggestions side by side with per-field choice and undo', async () => {
        mockPost.mockResolvedValue({ data: { refined_title: 'AI Ticket Triage', refined_description: 'Better problem', kpi: 'Cut handle time 30%' } });
        renderForm();
        fireEvent.change(screen.getByLabelText(/give your idea a short name/i), { target: { value: 'Triage' } });
        fireEvent.change(screen.getByLabelText(/what's the problem today/i), { target: { value: 'Slow' } });
        fireEvent.click(screen.getByRole('button', { name: /improve with ai/i }));

        const panel = await screen.findByRole('region', { name: 'AI suggestions' });
        expect(within(panel).getByText('AI Ticket Triage')).toBeInTheDocument();
        // Nothing is overwritten until the participant chooses.
        expect(screen.getByLabelText(/give your idea a short name/i)).toHaveValue('Triage');

        const nameCard = within(panel).getByText('Name').parentElement!;
        fireEvent.click(within(nameCard).getByRole('button', { name: 'Use suggestion' }));
        expect(screen.getByLabelText(/give your idea a short name/i)).toHaveValue('AI Ticket Triage');

        const problemCard = within(panel).getByText('Problem').parentElement!;
        fireEvent.click(within(problemCard).getByRole('button', { name: 'Keep mine' }));
        expect(screen.getByLabelText(/what's the problem today/i)).toHaveValue('Slow');

        fireEvent.click(screen.getByRole('button', { name: /undo ai changes/i }));
        expect(screen.getByLabelText(/give your idea a short name/i)).toHaveValue('Triage');
    });

    it('keeps technical analysis under a collapsed IT reviewers section', () => {
        renderForm();
        const section = screen.getByText('For IT reviewers (optional)').closest('details')!;
        expect(section).not.toHaveAttribute('open');
        expect(within(section).getByRole('button', { name: /technical deep dive/i })).toBeInTheDocument();
    });
});

describe('UseCaseDetailModal', () => {
    const useCase = { id: 'uc-1', title: 'Mine', description: 'Problem', kpi: 'k', target_user: 't', participant_id: 'p-1' };

    it('lets owners withdraw their use case after confirming', async () => {
        mockDelete.mockResolvedValue({ data: {} });
        mockGet.mockResolvedValue({ data: {} });
        const onUpdate = vi.fn();
        const onClose = vi.fn();
        withTheme(<UseCaseDetailModal useCase={useCase} participantId="p-1" isOwner onClose={onClose} onUpdate={onUpdate} />);
        fireEvent.click(screen.getByRole('button', { name: /withdraw/i }));
        expect(screen.getByText('Withdraw this use case?')).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole('button', { name: 'Withdraw' }).pop()!);
        await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/usecases/uc-1', { params: { participant_id: 'p-1' } }));
        expect(onUpdate).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it('applies the same required-field rules when editing', async () => {
        mockGet.mockResolvedValue({ data: {} });
        withTheme(<UseCaseDetailModal useCase={{ ...useCase, kpi: '' }} participantId="p-1" isOwner onClose={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
        expect(await screen.findByText(/how would we measure success\?: please fill this in/i)).toBeInTheDocument();
        expect(mockPut).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalled();
    });
});

describe('ScoringCard clarity', () => {
    it('shows card position and the same low/high anchors as the matrix', () => {
        render(
            <ScoringCard
                session={{ participantId: 'p', workshopId: 'w' }}
                activeCard={{ id: 'a', title: 'Alpha', position: 2, total: 5 }}
                criteria={[{ name: 'Value' }]}
            />
        );
        expect(screen.getByText(/Now scoring · Card 2 of 5/)).toBeInTheDocument();
        expect(screen.getByText('0 · Low')).toBeInTheDocument();
        expect(screen.getByText('100 · High')).toBeInTheDocument();
    });
});
