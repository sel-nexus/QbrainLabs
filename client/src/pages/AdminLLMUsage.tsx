import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Activity,
    Cpu,
    Users,
    FolderKanban,
    TrendingUp,
    DollarSign,
    RefreshCw,
    CheckCircle2,
    XCircle,
    BarChart2,
    Clock,
    ChevronDown,
    Server,
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/config';

const API_BASE = API_BASE_URL;
const TOKEN_KEY = 'hm_auth_token';

// ── Types ────────────────────────────────────────────────────────────────────

interface LLMUsageSummary {
    total_calls: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_tokens: number;
    estimated_cost_cents: number;
    unique_users: number;
    unique_workshops: number;
    success_count: number;
    error_count: number;
}

interface LLMUsageByFeature {
    feature: string;
    call_count: number;
    total_tokens: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    estimated_cost_cents: number;
    success_count: number;
    error_count: number;
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

interface LLMUsageByModel {
    model_name: string;
    call_count: number;
    total_tokens: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    estimated_cost_cents: number;
    success_count: number;
    error_count: number;
}

interface LLMUsageByDay {
    date: string;
    call_count: number;
    total_tokens: number;
    estimated_cost_cents: number;
}

interface LLMRecentLog {
    id: string;
    feature: string;
    model_name: string | null;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost_cents: number;
    success: string;
    workshop_id: string | null;
    user_id: string | null;
    created_at: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const FEATURE_LABELS: Record<string, string> = {
    enhance: 'AI Enhance',
    roi: 'ROI Estimation',
    roi_robust: 'ROI Estimation (Advanced)',
    summary: 'Summary Generation',
    copilot: 'AI Copilot',
    feasibility: 'Feasibility Check',
    business_case: 'Business Case',
    business_case_full: 'Business Case (Full)',
    business_value: 'Business Value',
    technical: 'Technical Analysis',
    document: 'Document Analysis',
    vision: 'Image Analysis',
    knowledge_impact: 'Knowledge Impact Analysis',
};

const DATE_PRESETS = [
    { label: 'Today', days: 1 },
    { label: '7 Days', days: 7 },
    { label: '30 Days', days: 30 },
    { label: 'All Time', days: 0 },
];

type TabKey = 'feature' | 'workshop' | 'user' | 'model' | 'trend' | 'logs';

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
};

const formatCost = (cents: number) => `$${(cents / 100).toFixed(4)}`;
const formatCostDisplay = (cents: number) => {
    const d = cents / 100;
    if (d >= 1) return `$${d.toFixed(2)}`;
    return `$${d.toFixed(4)}`;
};

const getFeatureLabel = (f: string) =>
    FEATURE_LABELS[f] || f.charAt(0).toUpperCase() + f.slice(1).replace(/_/g, ' ');

const successRate = (ok: number, total: number) =>
    total === 0 ? '–' : `${Math.round((ok / total) * 100)}%`;

const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
};

// ── Component ────────────────────────────────────────────────────────────────

export function AdminLLMUsage() {
    const { theme } = useTheme();
    const isLight = theme === 'light';

    // State
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>('feature');
    const [selectedPreset, setSelectedPreset] = useState(30); // days; 0 = all time

    const [summary, setSummary] = useState<LLMUsageSummary | null>(null);
    const [byFeature, setByFeature] = useState<LLMUsageByFeature[]>([]);
    const [byWorkshop, setByWorkshop] = useState<LLMUsageByWorkshop[]>([]);
    const [byUser, setByUser] = useState<LLMUsageByUser[]>([]);
    const [byModel, setByModel] = useState<LLMUsageByModel[]>([]);
    const [byDay, setByDay] = useState<LLMUsageByDay[]>([]);
    const [recentLogs, setRecentLogs] = useState<LLMRecentLog[]>([]);

    // ── Fetch ──────────────────────────────────────────────────────────────

    const buildDateParams = useCallback(() => {
        if (selectedPreset === 0) return '';
        const d = new Date();
        d.setDate(d.getDate() - selectedPreset);
        return `?start_date=${d.toISOString()}`;
    }, [selectedPreset]);

    const fetchAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const token = localStorage.getItem(TOKEN_KEY);
            const h = { Authorization: `Bearer ${token}` };
            const qs = buildDateParams();

            const [sRes, fRes, wRes, uRes, mRes, dRes, lRes] = await Promise.all([
                fetch(`${API_BASE}/api/admin/llm-usage/summary${qs}`, { headers: h }),
                fetch(`${API_BASE}/api/admin/llm-usage/by-feature${qs}`, { headers: h }),
                fetch(`${API_BASE}/api/admin/llm-usage/by-workshop${qs}`, { headers: h }),
                fetch(`${API_BASE}/api/admin/llm-usage/by-user${qs}`, { headers: h }),
                fetch(`${API_BASE}/api/admin/llm-usage/by-model${qs}`, { headers: h }),
                fetch(`${API_BASE}/api/admin/llm-usage/by-day${qs}`, { headers: h }),
                fetch(`${API_BASE}/api/admin/llm-usage/recent`, { headers: h }),
            ]);

            if (!sRes.ok) throw new Error('Failed to load LLM usage summary');

            const [s, f, w, u, m, d, l] = await Promise.all([
                sRes.json(), fRes.json(), wRes.json(), uRes.json(),
                mRes.json(), dRes.json(), lRes.json(),
            ]);

            setSummary(s);
            setByFeature(Array.isArray(f) ? f : []);
            setByWorkshop(Array.isArray(w) ? w : []);
            setByUser(Array.isArray(u) ? u : []);
            setByModel(Array.isArray(m) ? m : []);
            setByDay(Array.isArray(d) ? d : []);
            setRecentLogs(Array.isArray(l) ? l : []);
            setLastUpdated(new Date());
        } catch (err: any) {
            toast.error(err.message || 'Failed to load LLM usage data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [buildDateParams]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Styles ─────────────────────────────────────────────────────────────

    const card = `p-6 rounded-xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`;
    const th = `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isLight ? 'text-gray-500' : 'text-gray-400'}`;
    const thR = th + ' text-right';
    const td = `px-4 py-3 text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`;
    const tdR = td + ' text-right tabular-nums';
    const tr = `border-b last:border-0 ${isLight ? 'border-gray-100 hover:bg-gray-50' : 'border-white/5 hover:bg-white/5'}`;
    const empty = `py-16 text-center ${isLight ? 'text-gray-400' : 'text-gray-500'}`;

    const tab = (key: TabKey, icon: React.ReactNode, label: string) => (
        <button
            onClick={() => setActiveTab(key)}
            className={`px-4 py-3 flex items-center gap-2 border-b-2 text-sm font-medium transition whitespace-nowrap
        ${activeTab === key
                    ? 'border-brand-violet text-brand-violet'
                    : `border-transparent ${isLight ? 'text-gray-500 hover:text-gray-800' : 'text-gray-400 hover:text-white'}`}`}
        >
            {icon}{label}
        </button>
    );

    // ── Trend bar chart (CSS-only) ─────────────────────────────────────────

    const maxCalls = byDay.length ? Math.max(...byDay.map(d => d.call_count), 1) : 1;

    // ── Loading ────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <AdminLayout title="LLM Usage">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-violet" />
                </div>
            </AdminLayout>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <AdminLayout title="LLM Usage">
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-3 -mt-4 mb-6">
                <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    Monitor AI/LLM API usage across features, workshops, and users
                </p>

                <div className="flex items-center gap-2">
                    {/* Date preset filter */}
                    <div className={`flex rounded-lg overflow-hidden border text-sm ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                        {DATE_PRESETS.map(({ label, days }) => (
                            <button
                                key={days}
                                onClick={() => setSelectedPreset(days)}
                                className={`px-3 py-1.5 transition
                  ${selectedPreset === days
                                        ? 'bg-brand-violet text-white'
                                        : isLight ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/10'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchAll(true)}
                        disabled={refreshing}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition
              ${isLight ? 'border-gray-200 text-gray-600 hover:bg-gray-100' : 'border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Last updated */}
            {lastUpdated && (
                <p className={`text-xs mb-4 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                    Last updated {relativeTime(lastUpdated.toISOString())}
                </p>
            )}

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Total API Calls */}
                <div className={card}>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-violet-500/10">
                            <Activity className="w-4 h-4 text-violet-500" />
                        </div>
                        <span className={`text-xs font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Total API Calls</span>
                    </div>
                    <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {(summary?.total_calls || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle2 className="w-3 h-3" />
                            {(summary?.success_count || 0).toLocaleString()} ok
                        </span>
                        {(summary?.error_count || 0) > 0 && (
                            <span className="flex items-center gap-1 text-xs text-red-400">
                                <XCircle className="w-3 h-3" />
                                {summary!.error_count.toLocaleString()} err
                            </span>
                        )}
                    </div>
                </div>

                {/* Total Tokens */}
                <div className={card}>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Cpu className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className={`text-xs font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Total Tokens</span>
                    </div>
                    <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {formatTokens(summary?.total_tokens || 0)}
                    </div>
                    <div className={`text-xs mt-2 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span className="text-indigo-400">↑ {formatTokens(summary?.total_prompt_tokens || 0)}</span>
                        {' '}&nbsp;
                        <span className="text-emerald-400">↓ {formatTokens(summary?.total_completion_tokens || 0)}</span>
                    </div>
                </div>

                {/* Estimated Cost */}
                <div className={card}>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                            <DollarSign className="w-4 h-4 text-green-500" />
                        </div>
                        <span className={`text-xs font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Est. Cost</span>
                    </div>
                    <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {formatCostDisplay(summary?.estimated_cost_cents || 0)}
                    </div>
                    <div className={`text-xs mt-2 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                        {summary && summary.total_calls > 0
                            ? `~${formatCost(Math.round(summary.estimated_cost_cents / summary.total_calls))} / call`
                            : 'No calls yet'}
                    </div>
                </div>

                {/* Active Usage */}
                <div className={card}>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                            <TrendingUp className="w-4 h-4 text-amber-500" />
                        </div>
                        <span className={`text-xs font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Active Usage</span>
                    </div>
                    <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {summary?.unique_users || 0}
                    </div>
                    <div className={`text-xs mt-2 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                        Users &nbsp;|&nbsp; {summary?.unique_workshops || 0} Workshops
                    </div>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className={`flex gap-0 mb-0 border-b overflow-x-auto ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                {tab('feature',  <Cpu className="w-3.5 h-3.5" />, 'By Feature')}
                {tab('model',    <Server className="w-3.5 h-3.5" />, 'By Model')}
                {tab('workshop', <FolderKanban className="w-3.5 h-3.5" />, 'By Workshop')}
                {tab('user',     <Users className="w-3.5 h-3.5" />, 'By User')}
                {tab('trend',    <BarChart2 className="w-3.5 h-3.5" />, 'Daily Trend')}
                {tab('logs',     <Clock className="w-3.5 h-3.5" />, 'Recent Logs')}
            </div>

            {/* ── Data Panel ── */}
            <div className={`rounded-b-xl rounded-tr-xl border border-t-0 overflow-x-auto ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>

                {/* BY FEATURE */}
                {activeTab === 'feature' && (
                    <table className="w-full">
                        <thead className={isLight ? 'bg-gray-50' : 'bg-surface-700'}>
                            <tr>
                                <th className={th}>Feature</th>
                                <th className={thR}>Calls</th>
                                <th className={thR}>Prompt Tkns</th>
                                <th className={thR}>Completion Tkns</th>
                                <th className={thR}>Total Tokens</th>
                                <th className={thR}>Est. Cost</th>
                                <th className={thR}>Success Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {byFeature.length > 0 ? byFeature.map((item, i) => (
                                <tr key={i} className={tr}>
                                    <td className={`${td} font-medium`}>{getFeatureLabel(item.feature)}</td>
                                    <td className={tdR}>{item.call_count.toLocaleString()}</td>
                                    <td className={tdR}>{formatTokens(item.total_prompt_tokens)}</td>
                                    <td className={tdR}>{formatTokens(item.total_completion_tokens)}</td>
                                    <td className={tdR}>{formatTokens(item.total_tokens)}</td>
                                    <td className={tdR}>{formatCostDisplay(item.estimated_cost_cents)}</td>
                                    <td className={tdR}>
                                        <span className={item.error_count > 0 ? 'text-amber-500' : 'text-green-500'}>
                                            {successRate(item.success_count, item.call_count)}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={7} className={empty}>
                                    <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p>No feature usage data in this period</p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* BY MODEL */}
                {activeTab === 'model' && (
                    <table className="w-full">
                        <thead className={isLight ? 'bg-gray-50' : 'bg-surface-700'}>
                            <tr>
                                <th className={th}>Model</th>
                                <th className={thR}>Calls</th>
                                <th className={thR}>Prompt Tkns</th>
                                <th className={thR}>Completion Tkns</th>
                                <th className={thR}>Total Tokens</th>
                                <th className={thR}>Est. Cost</th>
                                <th className={thR}>Success Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {byModel.length > 0 ? byModel.map((item, i) => (
                                <tr key={i} className={tr}>
                                    <td className={`${td} font-mono text-xs`}>{item.model_name}</td>
                                    <td className={tdR}>{item.call_count.toLocaleString()}</td>
                                    <td className={tdR}>{formatTokens(item.total_prompt_tokens)}</td>
                                    <td className={tdR}>{formatTokens(item.total_completion_tokens)}</td>
                                    <td className={tdR}>{formatTokens(item.total_tokens)}</td>
                                    <td className={tdR}>{formatCostDisplay(item.estimated_cost_cents)}</td>
                                    <td className={tdR}>
                                        <span className={item.error_count > 0 ? 'text-amber-500' : 'text-green-500'}>
                                            {successRate(item.success_count, item.call_count)}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={7} className={empty}>
                                    <Server className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p>No model usage data in this period</p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* BY WORKSHOP */}
                {activeTab === 'workshop' && (
                    <table className="w-full">
                        <thead className={isLight ? 'bg-gray-50' : 'bg-surface-700'}>
                            <tr>
                                <th className={th}>Workshop</th>
                                <th className={thR}>Calls</th>
                                <th className={thR}>Total Tokens</th>
                                <th className={thR}>Est. Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {byWorkshop.length > 0 ? byWorkshop.map((item, i) => (
                                <tr key={i} className={tr}>
                                    <td className={td}>
                                        <div className="font-medium">{item.workshop_title || 'Untitled Workshop'}</div>
                                        <div className={`text-xs ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>{item.workshop_id.slice(0, 8)}…</div>
                                    </td>
                                    <td className={tdR}>{item.call_count.toLocaleString()}</td>
                                    <td className={tdR}>{formatTokens(item.total_tokens)}</td>
                                    <td className={tdR}>{formatCostDisplay(item.estimated_cost_cents)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className={empty}>
                                    <FolderKanban className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p>No workshop usage data in this period</p>
                                    <p className="text-xs mt-1 opacity-60">Ensure workshop_id is passed when tracking LLM calls</p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* BY USER */}
                {activeTab === 'user' && (
                    <table className="w-full">
                        <thead className={isLight ? 'bg-gray-50' : 'bg-surface-700'}>
                            <tr>
                                <th className={th}>User</th>
                                <th className={thR}>Calls</th>
                                <th className={thR}>Total Tokens</th>
                                <th className={thR}>Est. Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {byUser.length > 0 ? byUser.map((item, i) => (
                                <tr key={i} className={tr}>
                                    <td className={td}>
                                        <div className="font-medium">{item.user_name || item.user_email || 'Unknown'}</div>
                                        {item.user_email && item.user_name && (
                                            <div className={`text-xs ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>{item.user_email}</div>
                                        )}
                                    </td>
                                    <td className={tdR}>{item.call_count.toLocaleString()}</td>
                                    <td className={tdR}>{formatTokens(item.total_tokens)}</td>
                                    <td className={tdR}>{formatCostDisplay(item.estimated_cost_cents)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className={empty}>
                                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p>No user usage data in this period</p>
                                    <p className="text-xs mt-1 opacity-60">Ensure user_id is passed when tracking LLM calls</p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* DAILY TREND */}
                {activeTab === 'trend' && (
                    <div className="p-6">
                        {byDay.length > 0 ? (
                            <>
                                <p className={`text-xs mb-4 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                                    API calls per day — bar height proportional to call volume
                                </p>
                                {/* Bar chart */}
                                <div className="flex items-end gap-1.5 h-40 mb-4 overflow-x-auto pb-1">
                                    {byDay.map((d, i) => {
                                        const pct = Math.max(4, Math.round((d.call_count / maxCalls) * 100));
                                        return (
                                            <div key={i} className="flex flex-col items-center gap-1 min-w-[28px] group">
                                                <div
                                                    className="w-full bg-brand-violet rounded-t-sm opacity-80 group-hover:opacity-100 transition relative cursor-default"
                                                    style={{ height: `${pct}%` }}
                                                    title={`${d.date}: ${d.call_count} calls, ${formatTokens(d.total_tokens)} tokens`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Table */}
                                <table className="w-full">
                                    <thead>
                                        <tr>
                                            <th className={th}>Date</th>
                                            <th className={thR}>Calls</th>
                                            <th className={thR}>Tokens</th>
                                            <th className={thR}>Est. Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...byDay].reverse().map((d, i) => (
                                            <tr key={i} className={tr}>
                                                <td className={td}>{d.date}</td>
                                                <td className={tdR}>{d.call_count.toLocaleString()}</td>
                                                <td className={tdR}>{formatTokens(d.total_tokens)}</td>
                                                <td className={tdR}>{formatCostDisplay(d.estimated_cost_cents)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        ) : (
                            <div className={empty}>
                                <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p>No daily data in this period</p>
                            </div>
                        )}
                    </div>
                )}

                {/* RECENT LOGS */}
                {activeTab === 'logs' && (
                    <table className="w-full">
                        <thead className={isLight ? 'bg-gray-50' : 'bg-surface-700'}>
                            <tr>
                                <th className={th}>Time</th>
                                <th className={th}>Feature</th>
                                <th className={th}>Model</th>
                                <th className={thR}>Prompt</th>
                                <th className={thR}>Completion</th>
                                <th className={thR}>Total</th>
                                <th className={thR}>Cost</th>
                                <th className={th}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentLogs.length > 0 ? recentLogs.map((log) => (
                                <tr key={log.id} className={tr}>
                                    <td className={`${td} whitespace-nowrap text-xs`}>{relativeTime(log.created_at)}</td>
                                    <td className={td}>{getFeatureLabel(log.feature)}</td>
                                    <td className={`${td} font-mono text-xs`}>{log.model_name || '–'}</td>
                                    <td className={tdR}>{formatTokens(log.prompt_tokens)}</td>
                                    <td className={tdR}>{formatTokens(log.completion_tokens)}</td>
                                    <td className={`${tdR} font-medium`}>{formatTokens(log.total_tokens)}</td>
                                    <td className={tdR}>{formatCostDisplay(log.estimated_cost_cents)}</td>
                                    <td className={td}>
                                        {log.success === 'true'
                                            ? <span className="text-green-500 flex items-center gap-1 text-xs"><CheckCircle2 className="w-3 h-3" />ok</span>
                                            : <span className="text-red-400 flex items-center gap-1 text-xs"><XCircle className="w-3 h-3" />error</span>
                                        }
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={8} className={empty}>
                                    <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p>No recent log entries</p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </AdminLayout>
    );
}
