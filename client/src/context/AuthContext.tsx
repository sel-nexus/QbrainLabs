import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { API_BASE_URL as API_BASE } from '../lib/config';
import { AUTH_EXPIRED_EVENT } from '../lib/authEvents';
import { toast } from 'sonner';


export type UserRole = 'admin' | 'facilitator' | 'member';
export type AccountStatus = 'pending' | 'active' | 'disabled' | 'suspended';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: AccountStatus;
  is_admin: boolean;
  organization: string | null;
  mfa_enabled: boolean;
  last_login: string | null;
}

export interface MemberSession {
  session_id: string;
  session_token: string;
  workshop_id: string;
  workshop_title: string;
  display_name: string;
  participant_id: string;
  expires_at: string | null;
}

interface AuthState {
  user: User | null;
  memberSession: MemberSession | null;
  token: string | null;
  assignedWorkshops: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  isMember: boolean;
  showChangePasswordDialog: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  joinWorkshop: (pin: string, displayName: string) => Promise<MemberSession>;
  leaveWorkshop: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  canAccessWorkshop: (workshopId: string) => boolean;
  openChangePasswordDialog: () => void;
  closeChangePasswordDialog: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  organization?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'hm_auth_token';
const USER_KEY = 'hm_user';
const MEMBER_SESSION_KEY = 'hm_member_session';

function detectProxyBlockMessage(html: string): string {
  const lower = html.toLowerCase();
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

  const proxyName =
    (lower.includes('zscaler') || lower.includes('gateway.zscaler') || lower.includes('zscalerassistant')) ? 'Zscaler' :
    (lower.includes('fortiguard') || lower.includes('fortigate')) ? 'FortiGuard' :
    (lower.includes('bluecoat') || lower.includes('symantec') || lower.includes('broadcom')) ? 'Symantec/Broadcom' :
    (lower.includes('palo alto') || lower.includes('panw') || lower.includes('globalprotect')) ? 'Palo Alto' :
    (lower.includes('websense') || lower.includes('forcepoint')) ? 'Forcepoint' :
    (lower.includes('proxy') || lower.includes('firewall') || lower.includes('blocked') || lower.includes('access denied')) ? 'corporate proxy/firewall' :
    null;

  if (lower.includes('myhomenetwork.att.com') || lower.includes('phishing')) {
    return 'Login blocked by network security (ISP/Firewall). Please whitelist this site or check your internet filter settings.';
  }

  if (proxyName) {
    return isProduction
      ? `Login blocked by ${proxyName}. Please ask your IT team to whitelist ${window.location.hostname} in the corporate proxy, or try from a network without web filtering.`
      : `Request blocked by ${proxyName}. Comment out VITE_API_URL in .env and restart the client so API calls go through the local Vite proxy.`;
  }

  return isProduction
    ? 'Login failed (received HTML instead of JSON). A corporate proxy may be intercepting the request. Contact your IT team to whitelist this domain, or try from a different network.'
    : 'API unreachable (got HTML instead of JSON). A corporate proxy may be intercepting requests. Comment out VITE_API_URL in .env and restart the client.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    memberSession: null,
    token: null,
    assignedWorkshops: [],
    isLoading: true,
    isAuthenticated: false,
    isMember: false,
    showChangePasswordDialog: false,
  });

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for stored token
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);
        const storedMemberSession = localStorage.getItem(MEMBER_SESSION_KEY);

        if (storedToken && storedUser) {
          const user = JSON.parse(storedUser);
          setState(prev => ({
            ...prev,
            token: storedToken,
            user,
            isAuthenticated: true,
            isLoading: false,
          }));

          // Verify token is still valid
          try {
            const response = await fetch(`${API_BASE}/api/auth/me`, {
              headers: {
                'Authorization': `Bearer ${storedToken}`,
              },
            });

            if (response.ok) {
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('text/html')) {
                const text = await response.text();
                console.error('[Auth] initAuth: Received HTML instead of JSON:', text.substring(0, 200));
                throw new Error('API returned HTML');
              }
              const freshUser = await response.json();
              localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
              setState(prev => ({
                ...prev,
                user: freshUser,
                isLoading: false,
              }));
            } else {
              // Token invalid, clear auth
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
              setState(prev => ({
                ...prev,
                token: null,
                user: null,
                isAuthenticated: false,
                isLoading: false,
              }));
            }
          } catch {
            // Network error, keep stored data
            setState(prev => ({ ...prev, isLoading: false }));
          }
        } else if (storedMemberSession) {
          // Member session
          const memberSession = JSON.parse(storedMemberSession);
          setState(prev => ({
            ...prev,
            memberSession,
            isMember: true,
            isLoading: false,
          }));
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Base64-encode credentials so Zscaler/corporate DLP cannot pattern-match
    // field names like "password" or "email" in the request body.
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify({ email, password }))));

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ data: encoded }),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isNetwork = /failed to fetch|network error|load failed|connection refused/i.test(msg) || (err as { cause?: unknown })?.cause != null;
      throw new Error(
        isNetwork
          ? 'Cannot reach the server. Please check that the backend is running on port 8000.'
          : msg || 'Login request failed.'
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      const text = await response.text();
      console.error('[Auth] Received HTML response instead of JSON:', text.substring(0, 500));

      const message = detectProxyBlockMessage(text);
      throw new Error(message);
    }

    if (!response.ok) {
      const error = await response.json();
      console.error('[Auth] Login failed:', error);
      const msg = error.detail || error.error?.message || error.message || 'Login failed';
      throw new Error(msg);
    }

    const data = await response.json();
    console.log('[Auth] Login successful for user:', data.user?.email);

    // Store auth data
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    // Clear any member session
    localStorage.removeItem(MEMBER_SESSION_KEY);

    setState(prev => ({
      ...prev,
      token: data.access_token,
      user: data.user,
      assignedWorkshops: data.assigned_workshops || [],
      isAuthenticated: true,
      isMember: false,
      memberSession: null,
    }));
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      const text = await response.text();
      console.error('[Auth] Received HTML response instead of JSON (register):', text.substring(0, 500));
      throw new Error(detectProxyBlockMessage(text));
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.error?.message || error.message || 'Registration failed');
    }

    // Registration successful but account is pending
    // User needs to wait for admin approval
    return await response.json();
  }, []);

  const logout = useCallback(async () => {
    // Call logout endpoint if we have a token
    if (state.token) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${state.token}`,
          },
        });
      } catch {
        // Ignore logout errors
      }
    }

    // Clear storage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(MEMBER_SESSION_KEY);

    setState({
      user: null,
      memberSession: null,
      token: null,
      assignedWorkshops: [],
      isLoading: false,
      isAuthenticated: false,
      isMember: false,
      showChangePasswordDialog: false,
    });
  }, [state.token]);

  // Session expired (any API call returned 401 for our token): sign out
  // locally and tell the user why, instead of a generic error per screen.
  useEffect(() => {
    const onExpired = () => {
      if (!localStorage.getItem(TOKEN_KEY)) return;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setState(prev => ({ ...prev, user: null, token: null, isAuthenticated: false, assignedWorkshops: [] }));
      toast.error('Your session has expired. Please sign in again.', { id: 'session-expired' });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const joinWorkshop = useCallback(async (pin: string, displayName: string): Promise<MemberSession> => {
    const response = await fetch(`${API_BASE}/api/member/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin, display_name: displayName }),
      credentials: 'include', // For cookies
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.error?.message || error.message || 'Failed to join workshop');
    }

    const session: MemberSession = await response.json();

    // Store member session
    localStorage.setItem(MEMBER_SESSION_KEY, JSON.stringify(session));

    // Clear any facilitator auth
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    setState(prev => ({
      ...prev,
      memberSession: session,
      isMember: true,
      isAuthenticated: false,
      user: null,
      token: null,
    }));

    return session;
  }, []);

  const leaveWorkshop = useCallback(async () => {
    if (state.memberSession) {
      try {
        await fetch(`${API_BASE}/api/member/leave`, {
          method: 'POST',
          headers: {
            'Authorization': `Member ${state.memberSession.session_token}`,
          },
          credentials: 'include',
        });
      } catch {
        // Ignore leave errors
      }
    }

    localStorage.removeItem(MEMBER_SESSION_KEY);

    setState(prev => ({
      ...prev,
      memberSession: null,
      isMember: false,
    }));
  }, [state.memberSession]);

  const refreshUser = useCallback(async () => {
    if (!state.token) return;

    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${state.token}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        setState(prev => ({ ...prev, user }));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [state.token]);

  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!state.user) return false;

    const roles = Array.isArray(role) ? role : [role];

    // Admins have all roles
    if (state.user.is_admin) return true;

    return roles.includes(state.user.role);
  }, [state.user]);

  const canAccessWorkshop = useCallback((workshopId: string): boolean => {
    // Admins can access all workshops
    if (state.user?.is_admin) return true;

    // Check if user is assigned to this workshop
    if (state.assignedWorkshops.includes(workshopId)) return true;

    // Check member session
    if (state.memberSession?.workshop_id === workshopId) return true;

    return false;
  }, [state.user, state.assignedWorkshops, state.memberSession]);

  const openChangePasswordDialog = useCallback(() => {
    setState(prev => ({ ...prev, showChangePasswordDialog: true }));
  }, []);

  const closeChangePasswordDialog = useCallback(() => {
    setState(prev => ({ ...prev, showChangePasswordDialog: false }));
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    joinWorkshop,
    leaveWorkshop,
    refreshUser,
    hasRole,
    canAccessWorkshop,
    openChangePasswordDialog,
    closeChangePasswordDialog,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Role guard hook
export function useRequireRole(requiredRole: UserRole | UserRole[]) {
  const { user, isLoading, isAuthenticated, hasRole } = useAuth();

  return {
    isLoading,
    isAuthorized: isAuthenticated && hasRole(requiredRole),
    user,
  };
}

// Admin guard hook
export function useRequireAdmin() {
  return useRequireRole('admin');
}

// Facilitator guard hook  
export function useRequireFacilitator() {
  return useRequireRole(['admin', 'facilitator']);
}
