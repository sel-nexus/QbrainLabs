import { type ReactNode } from 'react';
import { Header } from './Header';
import { useTheme } from '../context/ThemeContext';

interface LayoutProps {
    children: ReactNode;
    showBackButton?: boolean;
    showHomeButton?: boolean;
    title?: string;
}

/**
 * Layout wrapper that provides consistent header and styling
 * for all authenticated pages. This ensures the top navigation
 * bar is displayed across all pages once a user is logged in.
 */
export function AuthenticatedLayout({
    children,
    showBackButton = true,
    showHomeButton = true,
    title
}: LayoutProps) {
    const { theme } = useTheme();

    return (
        <div className={`min-h-screen ${theme === 'light' ? 'bg-gray-50' : 'bg-surface-900'}`}>
            <Header
                showBackButton={showBackButton}
                showHomeButton={showHomeButton}
                title={title}
            />
            {/* Content area with top padding to account for fixed header */}
            <main className="pt-16">
                {children}
            </main>
        </div>
    );
}

/**
 * Layout wrapper for pages accessible to both authenticated and 
 * unauthenticated users (e.g., workshop detail, join pages).
 * The Header component automatically adapts based on login state.
 */
export function PublicWithHeaderLayout({
    children,
    showBackButton = true,
    showHomeButton = true,
    title
}: LayoutProps) {
    const { theme } = useTheme();

    return (
        <div className={`min-h-screen ${theme === 'light' ? 'bg-gray-50' : 'bg-surface-900'}`}>
            <Header
                showBackButton={showBackButton}
                showHomeButton={showHomeButton}
                title={title}
            />
            {/* Content area with top padding to account for fixed header */}
            <main className="pt-16">
                {children}
            </main>
        </div>
    );
}
