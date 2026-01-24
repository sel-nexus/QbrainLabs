import { useNavigate, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ui/ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Home, Grid3X3 } from 'lucide-react';

interface HeaderProps {
  showBackButton?: boolean;
  showHomeButton?: boolean;
  title?: string;
}

export function Header({ showBackButton = true, showHomeButton = true, title }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  
  const isLandingPage = location.pathname === '/';

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 ${
        theme === 'light' 
          ? 'bg-white/80 border-b border-gray-200' 
          : 'bg-surface-900/80 border-b border-white/5'
      } backdrop-blur-md`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* App Icon and Brand */}
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
              theme === 'light'
                ? 'hover:bg-gray-100'
                : 'hover:bg-white/5'
            }`}
            aria-label="Go to home"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-brand-violet to-brand-magenta rounded-lg flex items-center justify-center">
              <Grid3X3 className="w-5 h-5 text-white" />
            </div>
            <span className={`font-heading font-bold text-sm hidden sm:block ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              AI Hotspot Matrix
            </span>
          </button>

          {!isLandingPage && showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'light'
                  ? 'hover:bg-gray-100 text-gray-600'
                  : 'hover:bg-white/5 text-gray-400'
              }`}
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {!isLandingPage && showHomeButton && (
            <button
              onClick={() => navigate('/')}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'light'
                  ? 'hover:bg-gray-100 text-gray-600'
                  : 'hover:bg-white/5 text-gray-400'
              }`}
              aria-label="Go home"
            >
              <Home className="w-5 h-5" />
            </button>
          )}
          {title && (
            <h1 className={`text-lg font-semibold ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
