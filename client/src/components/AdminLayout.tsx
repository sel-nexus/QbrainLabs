import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    Settings,
    Brain,
    Activity,
    Lightbulb,
    Cpu,
    Menu,
    X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Header } from './Header';

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
    actions?: React.ReactNode;
}

export function AdminLayout({ children, title, actions }: AdminLayoutProps) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    // Below md the sidebar is a drawer; close it on navigation.
    const [drawerOpen, setDrawerOpen] = useState(false);
    const location = useLocation();
    useEffect(() => setDrawerOpen(false), [location.pathname]);
    // Auth check is handled by AdminGuard wrapper in routes

    const navItems = [
        { path: '/admin', label: t('admin.statistics'), icon: LayoutDashboard },
        { path: '/admin/workshops', label: t('admin.workshops'), icon: FolderKanban },
        { path: '/admin/usecases', label: 'AI Use Cases', icon: Lightbulb },
        { path: '/admin/users', label: t('admin.users'), icon: Users },
        { path: '/admin/facilitators', label: t('admin.facilitators'), icon: Users },
        { path: '/admin/knowledge-base', label: t('admin.knowledgeBase.title'), icon: Brain },
        { path: '/admin/llm-usage', label: t('admin.llmUsage'), icon: Activity },
        { path: '/admin/settings', label: t('admin.systemSettings'), icon: Settings },
        { path: '/admin/llm-models', label: 'LLM Models', icon: Cpu },
        { path: '/admin/my-workshops', label: t('admin.myWorkshops'), icon: FolderKanban },
    ];


    return (
        <div className={`min-h-screen ${isLight ? 'bg-gray-50' : 'bg-surface-900'}`}>
            {/* Consistent Header with user menu */}
            <Header showBackButton={false} />

            {/* Content area with top padding for fixed header */}
            <div className="flex pt-16">
                {drawerOpen && (
                    <div className="fixed inset-0 top-16 z-30 bg-black/50 md:hidden" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
                )}
                {/* Sidebar: static from md up, slide-in drawer below */}
                <aside
                    id="admin-sidebar"
                    className={`fixed top-16 bottom-0 left-0 z-40 w-64 overflow-y-auto transition-transform md:static md:z-auto md:translate-x-0 md:min-h-screen flex-shrink-0 border-r p-4 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'} ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}
                >
                    <nav aria-label="Admin" className="space-y-2 min-w-0">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            // end=true so "Statistics" (/admin) is only active at /admin, not at /admin/usecases etc.
                            const end = item.path === '/admin';
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={end}
                                    className={({ isActive }) =>
                                        `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition min-w-0 ${isActive
                                            ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                                            : isLight
                                                ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                        }`
                                    }
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                                    <span className="font-medium truncate min-w-0">{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0 p-4 md:p-8">
                    <button
                        type="button"
                        onClick={() => setDrawerOpen((v) => !v)}
                        aria-expanded={drawerOpen}
                        aria-controls="admin-sidebar"
                        aria-label={drawerOpen ? 'Close admin menu' : 'Open admin menu'}
                        className={`md:hidden mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${isLight ? 'border-gray-200 text-gray-700' : 'border-white/10 text-gray-200'}`}
                    >
                        {drawerOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
                        <span className="text-sm font-medium">Menu</span>
                    </button>
                    <div className="flex flex-wrap gap-3 justify-between items-center mb-8">
                        {title && <h2 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{t(`admin.${title.toLowerCase().replace(/\s+/g, '')}`, title)}</h2>}
                        {actions && <div>{actions}</div>}
                    </div>

                    {children}
                </main>
            </div>
        </div>
    );
}
