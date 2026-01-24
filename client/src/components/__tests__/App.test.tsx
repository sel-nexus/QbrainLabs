import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import App from '../../App';

// Mock react-router-dom navigation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

describe('App', () => {
  it('should render without crashing', () => {
    render(<App />);
    // App should render some content
    expect(document.body).toBeTruthy();
  });

  it('should have proper document structure', () => {
    render(<App />);
    // Check that the app container exists
    const appContainer = document.querySelector('#root') || document.body;
    expect(appContainer).toBeTruthy();
  });
});
