import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    Settings,
    Brain
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
    const { theme } = useTheme();
    const isLight = theme === 'light';
    // Auth check is handled by AdminGuard wrapper in routes


    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/workshops', label: 'Workshops', icon: FolderKanban },
        { path: '/admin/users', label: 'Users', icon: Users },
        { path: '/admin/facilitators', label: 'Facilitators', icon: Users },
        { path: '/admin/knowledge-base', label: 'AI Knowledge Base', icon: Brain },
        { path: '/admin/settings', label: 'System Settings', icon: Settings },
        { path: '/admin/my-workshops', label: 'My Workshops', icon: FolderKanban },
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
                        {title && <h2 className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{title}</h2>}
                        {actions && <div>{actions}</div>}
                    </div>
                    {children}
                </main>
            </div>
        </div>
    );
}
