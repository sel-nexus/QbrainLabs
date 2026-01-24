import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    Settings,
    LogOut,
    TrendingUp,
    Activity,
    CheckCircle,
    Brain
} from 'lucide-react';
import { Button } from '../components/ui/Button';

interface SystemStats {
    total_workshops: number;
    total_users: number;
    total_participants: number;
    active_workshops: number;
    workshops_today: number;
    workshops_this_week: number;
    workshops_this_month: number;
}

export function AdminPanel() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        // Check admin authentication
        const authToken = localStorage.getItem('authToken');
        const userStr = localStorage.getItem('currentUser');

        if (!authToken || !userStr) {
            toast.error('Please log in to access the admin panel');
            navigate('/facilitator-login');
            return;
        }

        const user = JSON.parse(userStr);
        if (!user.is_admin) {
            toast.error('Access denied. Administrator privileges required.');
            navigate('/dashboard');
            return;
        }

        setCurrentUser(user);
        fetchStats();
    }, [navigate]);

    const fetchStats = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:8000/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch stats');
            }

            const data = await response.json();
            setStats(data);
        } catch (error: any) {
            console.error('Error fetching stats:', error);
            toast.error('Failed to load system statistics');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        toast.success('Logged out successfully');
        navigate('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-900">
            {/* Header */}
            <header className="bg-surface-800 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500" />
                        <div>
                            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                            <p className="text-xs text-gray-400">AI Hotspot Matrix</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {currentUser && (
                            <div className="text-right">
                                <div className="text-sm text-white font-medium">{currentUser.full_name || currentUser.email}</div>
                                <div className="text-xs text-amber-400">Administrator</div>
                            </div>
                        )}
                        <Button variant="ghost" onClick={handleLogout} title="Logout">
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 bg-surface-800 min-h-screen border-r border-white/10 p-4">
                    <nav className="space-y-2">
                        <button
                            onClick={() => {/* Already here */ }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition"
                        >
                            <LayoutDashboard className="w-5 h-5" />
                            <span className="font-medium">Dashboard</span>
                        </button>
                        <button
                            onClick={() => navigate('/admin/workshops')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition"
                        >
                            <FolderKanban className="w-5 h-5" />
                            <span className="font-medium">Workshops</span>
                        </button>
                        <button
                            onClick={() => navigate('/admin/users')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition"
                        >
                            <Users className="w-5 h-5" />
                            <span className="font-medium">Users</span>
                        </button>
                        <button
                            onClick={() => navigate('/knowledge-base')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition"
                        >
                            <Brain className="w-5 h-5" />
                            <span className="font-medium">AI Knowledge Base</span>
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition"
                        >
                            <Settings className="w-5 h-5" />
                            <span className="font-medium">My Workshops</span>
                        </button>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8">
                    <h2 className="text-3xl font-bold text-white mb-8">System Overview</h2>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        {/* Total Workshops */}
                        <div className="bg-surface-800 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <FolderKanban className="w-6 h-6 text-purple-400" />
                                </div>
                                <TrendingUp className="w-5 h-5 text-green-400" />
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">
                                {stats?.total_workshops || 0}
                            </div>
                            <div className="text-sm text-gray-400">Total Workshops</div>
                        </div>

                        {/* Total Users */}
                        <div className="bg-surface-800 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-blue-400" />
                                </div>
                                <TrendingUp className="w-5 h-5 text-green-400" />
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">
                                {stats?.total_users || 0}
                            </div>
                            <div className="text-sm text-gray-400">Facilitators</div>
                        </div>

                        {/* Total Participants */}
                        <div className="bg-surface-800 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <Activity className="w-6 h-6 text-green-400" />
                                </div>
                                <TrendingUp className="w-5 h-5 text-green-400" />
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">
                                {stats?.total_participants || 0}
                            </div>
                            <div className="text-sm text-gray-400">Total Participants</div>
                        </div>

                        {/* Active Workshops */}
                        <div className="bg-surface-800 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-amber-400" />
                                </div>
                                <Activity className="w-5 h-5 text-amber-400" />
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">
                                {stats?.active_workshops || 0}
                            </div>
                            <div className="text-sm text-gray-400">Active Now</div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-surface-800 rounded-xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <button
                                onClick={() => navigate('/admin/workshops')}
                                className="p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition text-left"
                            >
                                <FolderKanban className="w-8 h-8 text-purple-400 mb-2" />
                                <div className="text-white font-medium">Manage Workshops</div>
                                <div className="text-sm text-gray-400">View and manage all workshops</div>
                            </button>
                            <button
                                onClick={() => navigate('/admin/users')}
                                className="p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition text-left"
                            >
                                <Users className="w-8 h-8 text-blue-400 mb-2" />
                                <div className="text-white font-medium">Manage Users</div>
                                <div className="text-sm text-gray-400">Create and manage facilitators</div>
                            </button>
                            <button
                                onClick={() => navigate('/knowledge-base')}
                                className="p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition text-left"
                            >
                                <Brain className="w-8 h-8 text-pink-400 mb-2" />
                                <div className="text-white font-medium">AI Knowledge Base</div>
                                <div className="text-sm text-gray-400">Browse industry use cases</div>
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition text-left"
                            >
                                <LayoutDashboard className="w-8 h-8 text-green-400 mb-2" />
                                <div className="text-white font-medium">My Workshops</div>
                                <div className="text-sm text-gray-400">View your own workshops</div>
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
