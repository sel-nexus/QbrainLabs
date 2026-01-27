import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../components/AdminLayout';
import { Button } from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

import { API_BASE_URL } from '../lib/config';

const API_BASE = API_BASE_URL;

export function AdminMyWorkshops() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { token, hasRole } = useAuth();
    const [workshops, setWorkshops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const isLight = theme === 'light';
    const isAdmin = hasRole('admin');

    const fetchWorkshops = useCallback(async () => {
        if (!token) return;

        try {
            setLoading(true);
            // Use the facilitator workshops endpoint which filters based on user permissions
            const response = await fetch(`${API_BASE}/api/facilitator/workshops`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('Failed to fetch workshops');

            const data = await response.json();
            setWorkshops(data);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load workshops');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        const authToken = localStorage.getItem('hm_auth_token');
        const userStr = localStorage.getItem('hm_user');

        if (!authToken || !userStr) {
            toast.error('Please log in to access the dashboard');
            navigate('/facilitator-login');
            return;
        }

        fetchWorkshops();
    }, [navigate, fetchWorkshops]);

    return (
        <AdminLayout title="My Workshops">
            {isAdmin && (
                <div className="flex justify-end mb-6">
                    <Button onClick={() => navigate('/facilitator/create')}>
                        <Plus className="w-5 h-5 mr-2" /> New Workshop
                    </Button>
                </div>
            )}

            {/* Workshop List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className={`col-span-3 text-center py-12 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                        Loading...
                    </div>
                ) : workshops.length > 0 ? (
                    workshops.map((w: any) => (
                        <div
                            key={w.id}
                            className={`rounded-2xl p-6 transition-all cursor-pointer border ${isLight ? 'bg-white border-gray-200 shadow-sm hover:border-brand-violet/50' : 'bg-surface-800/50 border-white/10 hover:border-brand-violet/50'}`}
                            onClick={() => navigate(`/workshop/${w.id}`)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="px-3 py-1 rounded-full text-xs font-mono bg-semantic-success/20 text-semantic-success font-semibold">
                                    {w.status || 'OPEN'}
                                </span>
                                <div className="text-right">
                                    <div className={`text-xs uppercase tracking-wider mb-1 font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                        PIN Code
                                    </div>
                                    <div className="font-mono text-xl font-bold text-brand-magenta">{w.pin}</div>
                                </div>
                            </div>
                            <h3 className={`text-xl font-bold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                {w.title}
                            </h3>
                            <p className={`text-sm mb-6 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                                Phase: {w.current_phase || 'Setup'}
                            </p>
                            <div className="flex gap-2">
                                <Button variant="secondary" className="w-full text-sm">Open Dashboard</Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={`col-span-1 md:col-span-3 h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center ${isLight ? 'border-gray-200 text-gray-500 bg-gray-50' : 'border-white/10 text-gray-400 bg-white/5'}`}>
                        <Users className="w-12 h-12 mb-4 opacity-50" />
                        <p>No active workshops found.</p>
                        {isAdmin ? (
                            <Button variant="ghost" className="mt-2 text-brand-violet" onClick={() => navigate('/facilitator/create')}>
                                Create your first session
                            </Button>
                        ) : (
                            <p className="text-sm mt-2 opacity-75">Contact an administrator to get assigned to workshops.</p>
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
