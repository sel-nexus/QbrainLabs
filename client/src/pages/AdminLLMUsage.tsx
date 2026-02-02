import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Activity,
    Cpu,
    Users,
    FolderKanban,
    TrendingUp,
    DollarSign
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { useTheme } from '../context/ThemeContext';

import { API_BASE_URL } from '../lib/config';

const API_BASE = API_BASE_URL;
const TOKEN_KEY = 'hm_auth_token';

interface LLMUsageSummary {
    total_calls: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_tokens: number;
    estimated_cost_cents: number;
    unique_users: number;
    unique_workshops: number;
}

interface LLMUsageByFeature {
    feature: string;
    call_count: number;
    total_tokens: number;
    estimated_cost_cents: number;
}

interface LLMUsageByWorkshop {
    workshop_id: string;
    workshop_title: string | null;
    call_count: number;
    total_tokens: number;
    estimated_cost_cents: number;
}

interface LLMUsageByUser {
    user_id: string;
    user_email: string | null;
    user_name: string | null;
    call_count: number;
    total_tokens: number;
    estimated_cost_cents: number;
}

// Feature display names
const FEATURE_LABELS: Record<string, string> = {
    'enhance': 'AI Enhance',
    'roi': 'ROI Estimation',
    'summary': 'Summary Generation',
    'copilot': 'AI Copilot',
    'feasibility': 'Feasibility Check',
    'business_case': 'Business Case',
    'technical': 'Technical Analysis',
    'document': 'Document Analysis',
    'vision': 'Image Analysis'
};

export function AdminLLMUsage() {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<LLMUsageSummary | null>(null);
    const [byFeature, setByFeature] = useState<LLMUsageByFeature[]>([]);
    const [byWorkshop, setByWorkshop] = useState<LLMUsageByWorkshop[]>([]);
    const [byUser, setByUser] = useState<LLMUsageByUser[]>([]);
    const [activeTab, setActiveTab] = useState<'feature' | 'workshop' | 'user'>('feature');

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const authToken = localStorage.getItem(TOKEN_KEY);
            const headers = { 'Authorization': `Bearer ${authToken}` };

            // Fetch all data in parallel
            const [summaryRes, featureRes, workshopRes, userRes] = await Promise.all([
                fetch(`${API_BASE}/api/admin/llm-usage/summary`, { headers }),
                fetch(`${API_BASE}/api/admin/llm-usage/by-feature`, { headers }),
                fetch(`${API_BASE}/api/admin/llm-usage/by-workshop`, { headers }),
                fetch(`${API_BASE}/api/admin/llm-usage/by-user`, { headers })
            ]);

            if (!summaryRes.ok) throw new Error('Failed to fetch LLM usage summary');

            const summaryData = await summaryRes.json();
            const featureData = await featureRes.json();
            const workshopData = await workshopRes.json();
            const userData = await userRes.json();

            setSummary(summaryData);
            setByFeature(featureData);
            setByWorkshop(workshopData);
            setByUser(userData);
        } catch (error: any) {
            console.error('Error fetching LLM usage data:', error);
            toast.error('Failed to load LLM usage data');
        } finally {
            setLoading(false);
        }
    };

    const formatTokens = (tokens: number) => {
        if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
        if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
        return tokens.toString();
    };

    const formatCost = (cents: number) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    const getFeatureLabel = (feature: string) => {
        return FEATURE_LABELS[feature] || feature.charAt(0).toUpperCase() + feature.slice(1);
    };

    if (loading) {
        return (
            <AdminLayout title="LLM Usage">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-violet"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="LLM Usage">
            {/* Description */}
            <p className={`mb-6 -mt-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                Monitor AI/LLM API usage across features, workshops, and users
            </p>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Total Calls */}
                <div className={`p-6 rounded-xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-violet-500/10">
                            <Activity className="w-5 h-5 text-violet-500" />
                        </div>
                        <span className={`text-sm font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Total API Calls</span>
                    </div>
                    <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {summary?.total_calls.toLocaleString() || 0}
                    </div>
                </div>

                {/* Total Tokens */}
                <div className={`p-6 rounded-xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Cpu className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className={`text-sm font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Total Tokens</span>
                    </div>
                    <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {formatTokens(summary?.total_tokens || 0)}
                    </div>
                    <div className={`text-xs mt-1 ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                        Prompt: {formatTokens(summary?.total_prompt_tokens || 0)} | Completion: {formatTokens(summary?.total_completion_tokens || 0)}
                    </div>
                </div>

                {/* Estimated Cost */}
                <div className={`p-6 rounded-xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-green-500/10">
                            <DollarSign className="w-5 h-5 text-green-500" />
                        </div>
                        <span className={`text-sm font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Est. Cost</span>
                    </div>
                    <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {formatCost(summary?.estimated_cost_cents || 0)}
                    </div>
                </div>

                {/* Unique Users/Workshops */}
                <div className={`p-6 rounded-xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                            <TrendingUp className="w-5 h-5 text-amber-500" />
                        </div>
                        <span className={`text-sm font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Active Usage</span>
                    </div>
                    <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {summary?.unique_users || 0}
                    </div>
                    <div className={`text-xs mt-1 ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                        Users | {summary?.unique_workshops || 0} Workshops
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className={`flex gap-2 mb-6 border-b ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                <button
                    onClick={() => setActiveTab('feature')}
                    className={`px-4 py-3 flex items-center gap-2 border-b-2 transition ${activeTab === 'feature'
                        ? 'border-brand-violet text-brand-violet'
                        : `border-transparent ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`
                        }`}
                >
                    <Cpu className="w-4 h-4" />
                    <span className="font-medium">By Feature</span>
                </button>
                <button
                    onClick={() => setActiveTab('workshop')}
                    className={`px-4 py-3 flex items-center gap-2 border-b-2 transition ${activeTab === 'workshop'
                        ? 'border-brand-violet text-brand-violet'
                        : `border-transparent ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`
                        }`}
                >
                    <FolderKanban className="w-4 h-4" />
                    <span className="font-medium">By Workshop</span>
                </button>
                <button
                    onClick={() => setActiveTab('user')}
                    className={`px-4 py-3 flex items-center gap-2 border-b-2 transition ${activeTab === 'user'
                        ? 'border-brand-violet text-brand-violet'
                        : `border-transparent ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`
                        }`}
                >
                    <Users className="w-4 h-4" />
                    <span className="font-medium">By User</span>
                </button>
            </div>

            {/* Data Tables */}
            <div className={`rounded-xl border overflow-hidden ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                {activeTab === 'feature' && (
                    <table className="w-full">
                        <thead className={isLight ? 'bg-gray-50' : 'bg-surface-700'}>
                            <tr>
                                <th className={`px-6 py-4 text-left text-sm font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Feature</th>
                                <th className={`px-6 py-4 text-right text-sm font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Calls</th>
                                <th className={`px-6 py-4 text-right text-sm font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Tokens</th>
                                <th className={`px-6 py-4 text-right text-sm font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Est. Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                            {byFeature.length > 0 ? byFeature.map((item, idx) => (
                                <tr key={idx} className={isLight ? 'hover:bg-gray-50' : 'hover:bg-white/5'}>
                                    <td className={`px-6 py-4 font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                        {getFeatureLabel(item.feature)}
                                    </td>
                                    <td className={`px-6 py-4 text-right ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {item.call_count.toLocaleString()}
                                    </td>
                                    <td className={`px-6 py-4 text-right ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {formatTokens(item.total_tokens)}
                                    </td>
                                    <td className={`px-6 py-4 text-right ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {formatCost(item.estimated_cost_cents)}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className={`px-6 py-12 text-center ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No LLM usage data yet</p>
                                        <p className="text-sm opacity-75 mt-1">Usage will appear here once AI features are used</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {activeTab === 'workshop' && (
                    <table className="w-full">
                        <thead className={isLight ? 'bg-gray-50' : 'bg-surface-700'}>
                            <tr>
                                <th className={`px-6 py-4 text-left text-sm font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Workshop</th>
                                <th className={`px-6 py-4 text-right text-sm font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Calls</th>
                                <th className={`px-6 py-4 text-right text-sm font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Tokens</th>
                                <th className={`px-6 py-4 text-right text-sm font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Est. Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                            {byWorkshop.length > 0 ? byWorkshop.map((item, idx) => (
                                <tr key={idx} className={isLight ? 'hover:bg-gray-50' : 'hover:bg-white/5'}>
                                    <td className={`px-6 py-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                        <div className="font-medium">{item.workshop_title || 'Untitled Workshop'}</div>
                                        <div className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>{item.workshop_id.slice(0, 8)}...</div>
                                    </td>
                                    <td className={`px-6 py-4 text-right ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {item.call_count.toLocaleString()}
                                    </td>
                                    <td className={`px-6 py-4 text-right ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {formatTokens(item.total_tokens)}
                                    </td>
                                    <td className={`px-6 py-4 text-right ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {formatCost(item.estimated_cost_cents)}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className={`px-6 py-12 text-center ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No workshop usage data yet</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {activeTab === 'user' && (
                    <table className="w-full">
                        <thead className={isLight ? 'bg-gray-50' : 'bg-surface-700'}>
                            <tr>
                                <th className={`px-6 py-4 text-left text-sm font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>User</th>
                                <th className={`px-6 py-4 text-right text-sm font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Calls</th>
                                <th className={`px-6 py-4 text-right text-sm font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Tokens</th>
                                <th className={`px-6 py-4 text-right text-sm font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Est. Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                            {byUser.length > 0 ? byUser.map((item, idx) => (
                                <tr key={idx} className={isLight ? 'hover:bg-gray-50' : 'hover:bg-white/5'}>
                                    <td className={`px-6 py-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                        <div className="font-medium">{item.user_name || item.user_email || 'Unknown User'}</div>
                                        {item.user_email && item.user_name && (
                                            <div className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>{item.user_email}</div>
                                        )}
                                    </td>
                                    <td className={`px-6 py-4 text-right ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {item.call_count.toLocaleString()}
                                    </td>
                                    <td className={`px-6 py-4 text-right ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {formatTokens(item.total_tokens)}
                                    </td>
                                    <td className={`px-6 py-4 text-right ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {formatCost(item.estimated_cost_cents)}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className={`px-6 py-12 text-center ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No user usage data yet</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </AdminLayout>
    );
}
