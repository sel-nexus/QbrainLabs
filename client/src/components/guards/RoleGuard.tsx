import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../context/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: UserRole | UserRole[];
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

export function RoleGuard({ 
  children, 
  requiredRole, 
  fallbackPath = '/facilitator-login',
  showAccessDenied = false 
}: RoleGuardProps) {
  const { isLoading, isAuthenticated, hasRole, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-bg-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-violet"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  if (!hasRole(requiredRole)) {
    if (showAccessDenied) {
      return <AccessDenied requiredRole={requiredRole} userRole={user?.role} />;
    }
    
    // Redirect based on user's actual role
    if (user?.is_admin) {
      return <Navigate to="/admin" replace />;
    } else if (user?.role === 'facilitator') {
      return <Navigate to="/facilitator/dashboard" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

interface AccessDeniedProps {
  requiredRole: UserRole | UserRole[];
  userRole?: UserRole;
}

function AccessDenied({ requiredRole, userRole }: AccessDeniedProps) {
  const roles = Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole;
  
  return (
    <div className="min-h-screen flex items-center justify-center theme-bg-primary">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          You don't have permission to access this page.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Required role: <span className="font-medium capitalize">{roles}</span>
          <br />
          Your role: <span className="font-medium capitalize">{userRole || 'Unknown'}</span>
        </p>
        <a 
          href="/"
          className="inline-block px-6 py-2 bg-brand-violet text-white rounded-lg hover:bg-brand-violet/90 transition-colors"
        >
          Go to Home
        </a>
      </div>
    </div>
  );
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard requiredRole="admin" fallbackPath="/facilitator-login" showAccessDenied>
      {children}
    </RoleGuard>
  );
}

export function FacilitatorGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard requiredRole={['admin', 'facilitator']} fallbackPath="/facilitator-login">
      {children}
    </RoleGuard>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, isMember } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-bg-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-violet"></div>
      </div>
    );
  }

  if (!isAuthenticated && !isMember) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function MemberGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isMember, memberSession } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-bg-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-violet"></div>
      </div>
    );
  }

  if (!isMember || !memberSession) {
    return <Navigate to="/join" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
