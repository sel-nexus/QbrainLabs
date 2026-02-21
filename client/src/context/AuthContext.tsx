import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { API_BASE_URL as API_BASE } from '../lib/config';


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
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formData,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isNetwork = /failed to fetch|network error|load failed|connection refused/i.test(msg) || (err as { cause?: unknown })?.cause != null;
      throw new Error(
        isNetwork
          ? 'Backend not running. In a new terminal: cd server, then run .venv\\Scripts\\python.exe -m uvicorn app.main:app --reload --port 8000'
          : msg || 'Login request failed.'
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      const text = await response.text();
      console.error('[Auth] Received HTML response instead of JSON:', text.substring(0, 500));

      // Check if the HTML response indicates a network-level block (e.g. AT&T ActiveArmor)
      const isBlocked = text.includes('myhomenetwork.att.com') || text.includes('phishing');
      const message = isBlocked
        ? 'Login blocked by network security (ISP/Firewall). Please whitelist this site in your AT&T Smart Home Manager or check your internet filter settings.'
        : 'API unreachable (got HTML instead of JSON). Ensure the backend is running (e.g. port 8000). In .env you can set VITE_API_URL=http://localhost:8000 and restart the client to call the API directly.';

      throw new Error(message);
    }

    if (!response.ok) {
      const error = await response.json();
      console.error('[Auth] Login failed:', error);
      throw new Error(error.detail || 'Login failed');
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
      throw new Error('API unreachable (got HTML). Ensure the backend is running. Set VITE_API_URL=http://localhost:8000 in .env and restart the client if needed.');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
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
      throw new Error(error.detail || 'Failed to join workshop');
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
