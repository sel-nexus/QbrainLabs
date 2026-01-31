import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/test-utils';
import { ScoringCard } from '../ScoringCard';

const mockSession = {
  participantId: 'test-participant-id',
  workshopId: 'test-workshop-id',
};

const mockActiveCard = {
  id: '1',
  title: 'Test Use Case',
  description: 'Test description for the use case',
  proposed_solution: 'Test proposed solution',
};

const mockCriteria = [
  { name: 'Feasibility', weight: 50 },
  { name: 'Impact', weight: 50 },
];

describe('ScoringCard', () => {
  it('should render use case title when active card is provided', () => {
    render(
      <ScoringCard
        session={mockSession}
        activeCard={mockActiveCard}
        criteria={mockCriteria}
      />
    );
    expect(screen.getByText('Test Use Case')).toBeInTheDocument();
  });

  it('should render all criteria labels', () => {
    render(
      <ScoringCard
        session={mockSession}
        activeCard={mockActiveCard}
        criteria={mockCriteria}
      />
    );
    expect(screen.getByText('Feasibility')).toBeInTheDocument();
    expect(screen.getByText('Impact')).toBeInTheDocument();
  });

  it('should render submit button', () => {
    render(
      <ScoringCard
        session={mockSession}
        activeCard={mockActiveCard}
        criteria={mockCriteria}
      />
    );
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('should show waiting message when no active card', () => {
    render(
      <ScoringCard
        session={mockSession}
        activeCard={null}
        criteria={mockCriteria}
      />
    );
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(screen.getByText(/waiting for the facilitator/i)).toBeInTheDocument();
  });
});
