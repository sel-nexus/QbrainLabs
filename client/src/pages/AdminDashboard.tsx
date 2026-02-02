import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Plus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ChangePasswordDialog } from '../components/ChangePasswordDialog';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export function AdminDashboard() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { isLoading, hasRole } = useAuth();
    const isAdmin = hasRole('admin');
    const [workshops, setWorkshops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showChangePassword, setShowChangePassword] = useState(false);

    useEffect(() => {
        // Auth check is now handled by FacilitatorGuard wrapper
        if (!isLoading) {
            fetchWorkshops();
        }
    }, [isLoading]);

    const fetchWorkshops = async () => {
        try {
            const { data } = await api.get('workshops/');
            setWorkshops(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Header is now provided by AuthenticatedLayout wrapper
    return (
        <>
            {showChangePassword && (
                <ChangePasswordDialog onClose={() => setShowChangePassword(false)} />
            )}

            <main className="max-w-6xl mx-auto px-8 pb-8">
                <section className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className={`text-3xl font-bold mb-2 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                            My Workshops
                        </h2>
                        <p className={theme === 'light' ? 'text-gray-600' : 'text-gray-300'}>
                            Manage your active strategy sessions.
                        </p>
                    </div>
                    {isAdmin && (
                        <Button onClick={() => navigate('/facilitator/create')}>
                            <Plus className="w-5 h-5 mr-2" /> New Workshop
                        </Button>
                    )}
                </section>

                {/* Workshop List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className={`col-span-3 text-center py-12 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                            Loading...
                        </div>
                    ) : workshops.length > 0 ? (
                        workshops.map((w: any) => (
                            <div
                                key={w.id}
                                className={`rounded-2xl p-6 transition-all cursor-pointer ${theme === 'light'
                                        ? 'bg-white border-2 border-gray-200 hover:border-brand-violet/50 hover:shadow-lg'
                                        : 'bg-surface-800/50 border border-white/10 hover:border-brand-violet/50'
                                    }`}
                                onClick={() => navigate(`/workshop/${w.id}`)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className="px-3 py-1 rounded-full text-xs font-mono bg-semantic-success/20 text-semantic-success font-semibold">
                                        {w.status || 'OPEN'}
                                    </span>
                                    <div className="text-right">
                                        <div className={`text-xs uppercase tracking-wider mb-1 font-medium ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                            }`}>
                                            PIN Code
                                        </div>
                                        <div className="font-mono text-xl font-bold text-brand-magenta">{w.pin}</div>
                                    </div>
                                </div>
                                <h3 className={`text-xl font-bold mb-2 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                    {w.title}
                                </h3>
                                <p className={`text-sm mb-6 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                                    Phase: {w.current_phase || 'Setup'}
                                </p>
                                <div className="flex gap-2">
                                    <Button variant="secondary" className="w-full text-sm">Open Dashboard</Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className={`col-span-1 md:col-span-3 h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center ${theme === 'light'
                                ? 'border-gray-300 text-gray-500 bg-gray-50'
                                : 'border-white/10 text-gray-400 bg-white/5'
                            }`}>
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
            </main>
        </>
    );
}
