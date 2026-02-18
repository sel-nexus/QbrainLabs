import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../../context/ThemeContext';
import { AuthProvider } from '../../context/AuthContext';
import { SessionProvider } from '../../context/SessionContext';
import App from '../../App';

const renderApp = (initialPath = '/') => {
  window.history.pushState({}, '', initialPath);
  return rtlRender(
    <ThemeProvider>
      <AuthProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('should render without crashing', () => {
    renderApp();
    expect(document.body).toBeTruthy();
  });

  it('should have proper document structure', () => {
    renderApp();
    expect(screen.getByText('Qbrain AI Labs')).toBeInTheDocument();
  });

  // A1: FacilitatorRegister route
  it('should render FacilitatorRegister page at /facilitator-register', async () => {
    renderApp('/facilitator-register');
    await waitFor(() => {
      expect(screen.getByText('Facilitator Registration')).toBeInTheDocument();
    });
  });

  // A2: ParticipantRoute guard — redirects to /join when no session
  it('should redirect /lobby to /join when no session exists', async () => {
    renderApp('/lobby');
    await waitFor(() => {
      expect(document.location.pathname).toBe('/join');
    });
  });

  it('should redirect /participant-dashboard to /join when no session', async () => {
    renderApp('/participant-dashboard');
    await waitFor(() => {
      expect(document.location.pathname).toBe('/join');
    });
  });

  it('should redirect /intake to /join when no session', async () => {
    renderApp('/intake');
    await waitFor(() => {
      expect(document.location.pathname).toBe('/join');
    });
  });

  it('should redirect /scoring to /join when no session', async () => {
    renderApp('/scoring');
    await waitFor(() => {
      expect(document.location.pathname).toBe('/join');
    });
  });

  // A3: Catch-all route
  it('should catch unknown routes and redirect to home', async () => {
    renderApp('/this-route-does-not-exist');
    await waitFor(() => {
      expect(document.location.pathname).toBe('/');
    });
  });
});
