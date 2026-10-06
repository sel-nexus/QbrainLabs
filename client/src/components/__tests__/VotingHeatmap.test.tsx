import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import { VotingHeatmap } from '../VotingHeatmap';

// Mock the api module
vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { api } from '../../lib/api';

const mockHeatmapData = {
  workshop_id: 'test-workshop',
  criteria: ['Business Value', 'Feasibility'],
  heatmap: [
    {
      participant_id: 'p1',
      participant_name: 'Participant 1',
      scores: { 'Business Value': 8, 'Feasibility': 7 },
    },
    {
      participant_id: 'p2',
      participant_name: 'Participant 2',
      scores: { 'Business Value': 6, 'Feasibility': 9 },
    },
  ],
  participant_count: 2,
};

describe('VotingHeatmap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (api.get as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));
    render(<VotingHeatmap workshopId="test-workshop" />);
    // Loading state shows an animate-pulse div
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render heatmap with data', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockHeatmapData });
    render(<VotingHeatmap workshopId="test-workshop" />);
    
    await waitFor(() => {
      expect(screen.getByText('Score heatmap')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Participant 1')).toBeInTheDocument();
    expect(screen.getByText('Participant 2')).toBeInTheDocument();
    expect(screen.getByText('2 participants')).toBeInTheDocument();
  });

  it('should show empty state when no data', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ 
      data: { ...mockHeatmapData, heatmap: [] } 
    });
    render(<VotingHeatmap workshopId="test-workshop" />);
    
    await waitFor(() => {
      expect(screen.getByText(/no voting data available/i)).toBeInTheDocument();
    });
  });

  it('should display score legend', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockHeatmapData });
    render(<VotingHeatmap workshopId="test-workshop" />);
    
    await waitFor(() => {
      expect(screen.getByText('Score Legend:')).toBeInTheDocument();
    });
  });
});
