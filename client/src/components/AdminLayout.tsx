import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    Settings,
    Brain,
    Activity
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Header } from './Header';

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
    actions?: React.ReactNode;
}

export function AdminLayout({ children, title, actions }: AdminLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    // Auth check is handled by AdminGuard wrapper in routes

    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        { path: '/admin', label: t('admin.statistics'), icon: LayoutDashboard },
        { path: '/admin/workshops', label: t('admin.workshops'), icon: FolderKanban },
        { path: '/admin/users', label: t('admin.users'), icon: Users },
        { path: '/admin/facilitators', label: t('admin.facilitators'), icon: Users },
        { path: '/admin/knowledge-base', label: t('admin.knowledgeBase.title'), icon: Brain },
        { path: '/admin/llm-usage', label: t('admin.llmUsage'), icon: Activity },
        { path: '/admin/settings', label: t('admin.systemSettings'), icon: Settings },
        { path: '/admin/my-workshops', label: t('admin.myWorkshops'), icon: FolderKanban },
    ];


    return (
        <div className={`min-h-screen ${isLight ? 'bg-gray-50' : 'bg-surface-900'}`}>
            {/* Consistent Header with user menu */}
            <Header showBackButton={false} />

            {/* Content area with top padding for fixed header */}
            <div className="flex pt-16">
                {/* Sidebar */}
                <aside className={`w-64 min-h-screen border-r p-4 ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                    <nav className="space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${active
                                        ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                                        : isLight
                                            ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8">
                    <div className="flex justify-between items-center mb-8">
                        {title && <h2 className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{t(`admin.${title.toLowerCase().replace(/\s+/g, '')}`, title)}</h2>}
                        {actions && <div>{actions}</div>}
                    </div>

                    {children}
                </main>
            </div>
        </div>
    );
}
