import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/test-utils';
import { Header } from '../Header';

describe('Header', () => {
  it('should render the app brand', () => {
    render(<Header />);
    expect(screen.getByText('Qbrain AI Labs')).toBeInTheDocument();
  });

  it('should render home button', () => {
    render(<Header showHomeButton={true} />);
    expect(screen.getByRole('button', { name: /go to home/i })).toBeInTheDocument();
  });

  it('should render title when provided', () => {
    render(<Header title="Test Page" />);
    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });

  it('should include theme toggle', () => {
    render(<Header />);
    expect(screen.getByRole('button', { name: /switch to contrast mode/i })).toBeInTheDocument();
  });

  it('should include language switcher', () => {
    render(<Header />);
    expect(screen.getByRole('button', { name: /select language/i })).toBeInTheDocument();
  });
});
