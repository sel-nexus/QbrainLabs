import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from './ui/ThemeToggle';
import { LanguageSwitcher } from './common/LanguageSwitcher';
import { useTheme } from '../context/ThemeContext';
import { useSession } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Home, Grid3X3, LogOut, User, LayoutDashboard, Key, ChevronDown, Shield, Brain } from 'lucide-react';
import { toast } from 'sonner';

interface HeaderProps {
  showBackButton?: boolean;
  showHomeButton?: boolean;
  title?: string;
}

export function Header({ showBackButton = true, showHomeButton = true, title }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { session, logout: sessionLogout } = useSession();
  const { user: currentUser, token: authToken, isAuthenticated, logout: authLogout, openChangePasswordDialog } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isLandingPage = location.pathname === '/';
  const isLoginPage = location.pathname === '/facilitator-login';
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/facilitator/dashboard' || location.pathname === '/admin';
  const isLoggedIn = isAuthenticated || !!session;

  // Get the appropriate dashboard path based on user role
  const getDashboardPath = () => {
    if (currentUser?.is_admin) return '/admin';
    return '/facilitator/dashboard';
  };

  // Get the appropriate knowledge base path based on user role
  const getKnowledgeBasePath = () => {
    if (currentUser?.is_admin) return '/admin/knowledge-base';
    return '/facilitator/knowledge-base';
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    // Clear facilitator session via AuthContext
    await authLogout();
    // Clear participant session
    sessionLogout();
    toast.success('Logged out successfully');
    setShowUserMenu(false);
    navigate('/');
  };

  const getUserDisplayName = () => {
    if (currentUser) return currentUser.full_name || currentUser.email;
    if (session) return session.name;
    return 'Guest';
  };

  const getUserInitial = () => {
    const name = getUserDisplayName();
    return name ? name[0].toUpperCase() : 'U';
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 ${theme === 'light'
        ? 'bg-white/95 border-b border-gray-200 shadow-sm'
        : 'bg-surface-900/95 border-b border-white/10'
        } backdrop-blur-md`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* App Icon and Brand */}
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${theme === 'light'
              ? 'hover:bg-gray-100'
              : 'hover:bg-white/10'
              }`}
            aria-label="Go to home"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-brand-violet to-brand-magenta rounded-lg flex items-center justify-center shadow-lg">
              <Grid3X3 className="w-5 h-5 text-white" />
            </div>
            <span className={`font-heading font-bold text-sm hidden sm:block ${theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}>
              AI Hotspot Matrix
            </span>
          </button>

          {!isLandingPage && showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className={`p-2 rounded-lg transition-colors ${theme === 'light'
                ? 'hover:bg-gray-100 text-gray-700'
                : 'hover:bg-white/10 text-gray-300'
                }`}
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {!isLandingPage && showHomeButton && !isLoggedIn && (
            <button
              onClick={() => navigate('/')}
              className={`p-2 rounded-lg transition-colors ${theme === 'light'
                ? 'hover:bg-gray-100 text-gray-700'
                : 'hover:bg-white/10 text-gray-300'
                }`}
              aria-label="Go home"
            >
              <Home className="w-5 h-5" />
            </button>
          )}
          {title && (
            <h1 className={`text-lg font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}>
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Nav for logged-in facilitators */}
          {authToken && !isDashboard && (
            <button
              onClick={() => navigate(getDashboardPath())}
              className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'light'
                ? 'hover:bg-gray-100 text-gray-700'
                : 'hover:bg-white/10 text-gray-300'
                }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              {t('nav.dashboard')}
            </button>
          )}

          <LanguageSwitcher />

          <ThemeToggle />

          {/* User Menu */}
          {isLoggedIn ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 p-1.5 pl-2 rounded-lg transition-colors ${theme === 'light'
                  ? 'hover:bg-gray-100 text-gray-700'
                  : 'hover:bg-white/10 text-gray-200'
                  }`}
              >
                <span className={`hidden sm:block text-sm font-medium max-w-[120px] truncate ${theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                  }`}>
                  {getUserDisplayName()}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${theme === 'light'
                  ? 'bg-brand-violet/10 text-brand-violet'
                  : 'bg-brand-violet/20 text-brand-violet'
                  }`}>
                  {getUserInitial()}
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className={`absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl border overflow-hidden ${theme === 'light'
                  ? 'bg-white border-gray-200'
                  : 'bg-surface-800 border-white/10'
                  }`}>
                  {/* User Info */}
                  <div className={`px-4 py-3 border-b ${theme === 'light' ? 'border-gray-100 bg-gray-50' : 'border-white/5 bg-surface-900/50'
                    }`}>
                    <p className={`text-sm font-semibold truncate ${theme === 'light' ? 'text-gray-900' : 'text-white'
                      }`}>
                      {getUserDisplayName()}
                    </p>
                    <p className={`text-xs truncate ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                      {currentUser?.email || session?.role || 'Participant'}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    {authToken && (
                      <>
                        <button
                          onClick={() => { navigate(getDashboardPath()); setShowUserMenu(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${theme === 'light'
                            ? 'hover:bg-gray-100 text-gray-700'
                            : 'hover:bg-white/5 text-gray-300'
                            }`}
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          {t('nav.dashboard')}
                        </button>
                        {currentUser?.is_admin && (
                          <button
                            onClick={() => { navigate('/admin'); setShowUserMenu(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${theme === 'light'
                              ? 'hover:bg-gray-100 text-gray-700'
                              : 'hover:bg-white/5 text-gray-300'
                              }`}
                          >
                            <Shield className="w-4 h-4" />
                            {t('nav.adminPanel')}
                          </button>
                        )}
                        <button
                          onClick={() => { navigate(getKnowledgeBasePath()); setShowUserMenu(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${theme === 'light'
                            ? 'hover:bg-gray-100 text-gray-700'
                            : 'hover:bg-white/5 text-gray-300'
                            }`}
                        >
                          <Brain className="w-4 h-4" />
                          {t('nav.knowledgeBase')}
                        </button>
                      </>
                    )}

                    {authToken && (
                      <button
                        onClick={() => {
                          openChangePasswordDialog();
                          setShowUserMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${theme === 'light'
                          ? 'hover:bg-gray-100 text-gray-700'
                          : 'hover:bg-white/5 text-gray-300'
                          }`}
                      >
                        <Key className="w-4 h-4" />
                        {t('nav.changePassword')}
                      </button>
                    )}
                  </div>

                  {/* Logout */}
                  <div className={`py-2 border-t ${theme === 'light' ? 'border-gray-100' : 'border-white/5'
                    }`}>
                    <button
                      onClick={handleLogout}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${theme === 'light'
                        ? 'hover:bg-red-50 text-red-600'
                        : 'hover:bg-red-500/10 text-red-400'
                        }`}
                    >
                      <LogOut className="w-4 h-4" />
                      {t('nav.signOut')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Login Button for non-logged users (hidden on landing and login pages) */
            !isLandingPage && !isLoginPage && (
              <button
                onClick={() => navigate('/facilitator-login')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'light'
                  ? 'bg-brand-violet text-white hover:bg-brand-violet/90'
                  : 'bg-brand-violet text-white hover:bg-brand-violet/90'
                  }`}
              >
                <User className="w-4 h-4" />
                {t('nav.signIn')}
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
