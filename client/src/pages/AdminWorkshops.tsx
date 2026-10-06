import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
    FolderKanban,
    Search,
    Trash2,
    Eye,
    Calendar
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { AdminLayout } from '../components/AdminLayout';

import { API_BASE_URL } from '../lib/config';
import { apiErrorText } from '../lib/apiErrors';
import { useConfirm } from '../context/ConfirmContext';

const API_BASE = API_BASE_URL;

interface Workshop {
    id: string;
    title: string;
    pin: string | null;
    status: string;
    current_phase: string;
    facilitator_id: string;
    facilitator_name?: string;
    created_at?: string;
    participant_count?: number;
    use_case_count?: number;
}

export function AdminWorkshops() {
    const confirm = useConfirm();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { t } = useTranslation();
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const isLight = theme === 'light';

    useEffect(() => {
        fetchWorkshops();
    }, []);

    const fetchWorkshops = async () => {
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE}/api/admin/workshops`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch workshops');
            }

            const data = await response.json();
            setWorkshops(data.workshops || data);
        } catch (error: any) {
            console.error('Error fetching workshops:', error);
            toast.error(t('workshop.failedLoad'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteWorkshop = async (workshopId: string) => {
        if (!(await confirm.ok({ title: t('workshop.deleteWorkshopConfirm'), message: 'This cannot be undone.', confirmText: 'Delete' }))) return;

        try {
            const authToken = localStorage.getItem('hm_auth_token');
            if (!authToken) {
                toast.error(t('auth.loginRequired'));
                return;
            }

            const response = await fetch(`${API_BASE}/api/admin/workshops/${workshopId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                // Try to get error message from response
                let errorMessage = t('workshop.deleteWorkshopError', 'Failed to delete workshop');
                try {
                    const errorData = await response.json();
                    errorMessage = apiErrorText(errorData) || errorMessage;
                } catch {
                    // If response is not JSON, use status text
                    if (response.status === 404) {
                        errorMessage = t('workshop.notFound', 'Workshop not found');
                    } else if (response.status === 403) {
                        errorMessage = t('admin.noPermission', 'You do not have permission');
                    } else if (response.status === 400) {
                        errorMessage = t('workshop.alreadyDeleted', 'Workshop is already deleted');
                    }
                }
                throw new Error(errorMessage);
            }

            toast.success(t('workshop.deleteWorkshopSuccess'));
            // Refresh the workshop list
            await fetchWorkshops();
        } catch (error) {
            console.error('Error deleting workshop:', error);
            toast.error(error instanceof Error ? error.message : t('workshop.deleteWorkshopError', 'Failed to delete workshop'));
        }
    };

    const filteredWorkshops = workshops.filter(w =>
        w.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.pin && w.pin.includes(searchTerm))
    );

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <AdminLayout title="All Workshops">
            <div className="flex justify-end mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('workshop.searchWorkshops') as string}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:border-amber-500/50 w-64 ${isLight ? 'bg-white border-gray-200 text-gray-900 placeholder-gray-400' : 'bg-surface-800 border-white/10 text-white placeholder-gray-400'}`}
                    />
                </div>
            </div>

            {loading ? (
                <div className={`text-center py-12 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('common.loading')}</div>
            ) : filteredWorkshops.length === 0 ? (
                <div className="text-center py-12">
                    <FolderKanban className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className={isLight ? 'text-gray-500' : 'text-gray-400'}>{t('workshop.noWorkshops')}</p>
                </div>
            ) : (
                <div className={`rounded-xl border overflow-x-auto ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                    <table className="w-full">
                        <thead>
                            <tr className={`border-b ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                                <th className={`text-left py-4 px-6 text-sm font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('workshop.title')}</th>
                                <th className={`text-left py-4 px-6 text-sm font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('workshop.pincode')}</th>
                                <th className={`text-left py-4 px-6 text-sm font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.status')}</th>
                                <th className={`text-left py-4 px-6 text-sm font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('workshop.phase')}</th>
                                <th className={`text-left py-4 px-6 text-sm font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('common.created', 'Created')}</th>
                                <th className={`text-right py-4 px-6 text-sm font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWorkshops.map((workshop) => (
                                <tr key={workshop.id} className={`border-b transition ${isLight ? 'border-gray-100 hover:bg-gray-50' : 'border-white/5 hover:bg-white/5'}`}>
                                    <td className="py-4 px-6">
                                        <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{workshop.title}</div>
                                        {workshop.facilitator_name && (
                                            <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('workshop.by')} {workshop.facilitator_name}</div>
                                        )}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="font-mono text-amber-500">{workshop.pin || 'N/A'}</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${workshop.status === 'active' || workshop.status === 'OPEN'
                                            ? 'bg-green-500/20 text-green-600'
                                            : workshop.status === 'completed'
                                                ? 'bg-blue-500/20 text-blue-600'
                                                : 'bg-gray-500/20 text-gray-600'
                                            }`}>
                                            {String(workshop.status ? t(`workshop.${workshop.status.toLowerCase()}`, workshop.status) : t('workshop.open'))}
                                        </span>
                                    </td>
                                    <td className={`py-4 px-6 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                                        {String(workshop.current_phase ? t(`workshop.phases.${workshop.current_phase.toLowerCase()}`, workshop.current_phase) : t('workshop.phases.setup'))}
                                    </td>
                                    <td className={`py-4 px-6 text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {formatDate(workshop.created_at)}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => navigate(`/workshop/${workshop.id}`)}
                                                className={`p-2 rounded-lg transition ${isLight ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                title={t('workshop.viewWorkshop') as string}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteWorkshop(workshop.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                                title={t('workshop.deleteWorkshop') as string}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className={`mt-4 text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('workshop.showingWorkshops', { count: filteredWorkshops.length, total: workshops.length })}
            </div>
        </AdminLayout>
    );
}
