import { describe, it, expect } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import { ThemeProvider } from '../../context/ThemeContext';
import { AuthProvider } from '../../context/AuthContext';
import { SessionProvider } from '../../context/SessionContext';
import App from '../../App';

describe('App', () => {
  it('should render without crashing', () => {
    rtlRender(
      <ThemeProvider>
        <AuthProvider>
          <SessionProvider>
            <App />
          </SessionProvider>
        </AuthProvider>
      </ThemeProvider>
    );
    expect(document.body).toBeTruthy();
  });

  it('should have proper document structure', () => {
    rtlRender(
      <ThemeProvider>
        <AuthProvider>
          <SessionProvider>
            <App />
          </SessionProvider>
        </AuthProvider>
      </ThemeProvider>
    );
    // App renders routes, check for common elements like header brand
    expect(screen.getByText('Qbrain AI Labs')).toBeInTheDocument();
  });
});
