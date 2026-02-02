import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
    Users,
    FolderKanban,
    TrendingUp,
    Activity,
    CheckCircle,
    Brain,
    LayoutDashboard
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

import { API_BASE_URL } from '../lib/config';

const API_BASE = API_BASE_URL;
const TOKEN_KEY = 'hm_auth_token';

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
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState(true);
    const isLight = theme === 'light';

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const authToken = localStorage.getItem(TOKEN_KEY);
            const response = await fetch(`${API_BASE}/api/admin/stats`, {
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
            toast.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isLight ? 'bg-gray-50' : 'bg-surface-900'}`}>
                <div className={`text-xl ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('common.loading')}</div>
            </div>
        );
    }

    return (
        <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {/* Total Workshops */}
                <div className={`rounded-xl p-6 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <FolderKanban className="w-6 h-6 text-purple-400" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{stats?.total_workshops || 0}</div>
                    <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.workshops')}</div>
                </div>

                {/* Total Users */}
                <div className={`rounded-xl p-6 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-400" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{stats?.total_users || 0}</div>
                    <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.facilitators')}</div>
                </div>

                {/* Total Participants */}
                <div className={`rounded-xl p-6 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Activity className="w-6 h-6 text-green-400" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{stats?.total_participants || 0}</div>
                    <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('workshop.participants')}</div>
                </div>

                {/* Active Workshops */}
                <div className={`rounded-xl p-6 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-amber-400" />
                        </div>
                        <Activity className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{stats?.active_workshops || 0}</div>
                    <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.activeNow')}</div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className={`rounded-xl p-6 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                <h3 className={`text-xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.quickActions')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => navigate('/admin/workshops')}
                        className={`p-4 rounded-lg border transition text-left ${isLight ? 'bg-gray-50 hover:bg-gray-100 border-gray-200' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}
                    >
                        <FolderKanban className="w-8 h-8 text-purple-500 mb-2" />
                        <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.manageWorkshops')}</div>
                        <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.manageWorkshopsDesc')}</div>
                    </button>
                    <button
                        onClick={() => navigate('/admin/users')}
                        className={`p-4 rounded-lg border transition text-left ${isLight ? 'bg-gray-50 hover:bg-gray-100 border-gray-200' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}
                    >
                        <Users className="w-8 h-8 text-blue-500 mb-2" />
                        <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.manageUsers')}</div>
                        <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.manageUsersDesc')}</div>
                    </button>
                    <button
                        onClick={() => navigate('/admin/knowledge-base')}
                        className={`p-4 rounded-lg border transition text-left ${isLight ? 'bg-gray-50 hover:bg-gray-100 border-gray-200' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}
                    >
                        <Brain className="w-8 h-8 text-pink-500 mb-2" />
                        <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.knowledgeBase.title')}</div>
                        <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.aiKnowledgeBaseDesc')}</div>
                    </button>
                    <button
                        onClick={() => navigate('/admin/my-workshops')}
                        className={`p-4 rounded-lg border transition text-left ${isLight ? 'bg-gray-50 hover:bg-gray-100 border-gray-200' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}
                    >
                        <LayoutDashboard className="w-8 h-8 text-green-500 mb-2" />
                        <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.myWorkshops')}</div>
                        <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.myWorkshopsDesc')}</div>
                    </button>
                </div>
            </div>
        </>
    );
}

