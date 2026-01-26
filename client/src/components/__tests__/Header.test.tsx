import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/test-utils';
import { Header } from '../Header';
import { ThemeProvider } from '../../context/ThemeContext';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  );
};

describe('Header', () => {
  it('should render the app brand', () => {
    renderWithTheme(<Header />);
    expect(screen.getByText('Qbrain AI Labs')).toBeInTheDocument();
  });

  it('should render home button when showHomeButton is true', () => {
    renderWithTheme(<Header showHomeButton={true} />);
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('should render back button when showBackButton is true', () => {
    renderWithTheme(<Header showBackButton={true} />);
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });

  it('should render title when provided', () => {
    renderWithTheme(<Header title="Test Page" />);
    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });

  it('should include theme toggle', () => {
    renderWithTheme(<Header />);
    // ThemeToggle should be present
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
  });
});
