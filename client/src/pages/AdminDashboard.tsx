import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Plus, Settings, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function AdminDashboard() {
    const navigate = useNavigate();
    const [workshops, setWorkshops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWorkshops();
    }, []);

    const fetchWorkshops = async () => {
        try {
            const { data } = await api.get('/workshops/');
            setWorkshops(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-surface-900 p-8">
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-12">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-violet to-brand-magenta animate-pulse" />
                    <h1 className="text-2xl font-heading font-bold text-white tracking-tight">Hotspot Matrix</h1>
                </div>
                <div className="flex gap-4">
                    <Button variant="ghost"><Settings className="w-5 h-5" /></Button>
                    <div className="w-10 h-10 rounded-full bg-surface-800 border border-white/10" />
                </div>
            </header>

            <main className="max-w-6xl mx-auto">
                <section className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">My Workshops</h2>
                        <p className="text-gray-400">Manage your active strategy sessions.</p>
                    </div>
                    <Button onClick={() => navigate('/create')}>
                        <Plus className="w-5 h-5 mr-2" /> New Workshop
                    </Button>
                </section>

                {/* Workshop List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-3 text-center py-12 text-gray-500">Loading...</div>
                    ) : workshops.length > 0 ? (
                        workshops.map((w: any) => (
                            <div key={w.id} className="bg-surface-800/50 border border-white/10 rounded-2xl p-6 hover:border-brand-violet/50 transition-colors cursor-pointer" onClick={() => navigate(`/workshop/${w.id}`)}>
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-mono bg-semantic-success/20 text-semantic-success`}>
                                        {w.status || 'OPEN'}
                                    </span>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">PIN Code</div>
                                        <div className="font-mono text-xl font-bold text-brand-magenta">{w.pin}</div>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{w.title}</h3>
                                <p className="text-sm text-gray-400 mb-6">
                                    Phase: {w.current_phase || 'Setup'}
                                </p>
                                <div className="flex gap-2">
                                    <Button variant="secondary" className="w-full text-sm">Open Dashboard</Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-1 md:col-span-3 h-64 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-500 bg-white/5">
                            <Users className="w-12 h-12 mb-4 opacity-50" />
                            <p>No active workshops found.</p>
                            <Button variant="ghost" className="mt-2 text-brand-violet" onClick={() => navigate('/create')}>
                                Create your first session
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
