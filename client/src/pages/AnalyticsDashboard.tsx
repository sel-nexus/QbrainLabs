import { useEffect, useState } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
    TrendingUp, Users, Presentation, Activity, Download,
    ArrowUpRight, Target, Award, Loader2
} from 'lucide-react';
import { type AnalyticsOverview, type BenchmarkData, analyticsApi } from '../lib/api/analytics';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const AnalyticsDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalyticsOverview | null>(null);
    const [benchmarks, setBenchmarks] = useState<BenchmarkData | null>(null);
    const [period, setPeriod] = useState('30d');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [overviewData, benchmarkData] = await Promise.all([
                    analyticsApi.getOverview(period),
                    analyticsApi.getBenchmarks(benchmarks?.industry || 'Technology')
                ]);
                setData(overviewData);
                setBenchmarks(benchmarkData);
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
                toast.error('Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [period]);

    const handleExport = async () => {
        try {
            await analyticsApi.generateReport('Monthly Analytics', 'pdf');
            toast.success('Report generation started! You will receive a notification when ready.');
        } catch (error) {
            toast.error('Failed to generate report');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold theme-text-primary">Analytics Dashboard</h1>
                    <p className="theme-text-secondary">Insights across all your workshops</p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="rounded-lg theme-border theme-bg-secondary theme-text-primary text-sm p-2.5"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last quarter</option>
                        <option value="year">This year</option>
                    </select>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                        <Download size={16} />
                        Export Report
                    </button>
                </div>
            </div>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Workshops"
                    value={data.performance.total_workshops}
                    icon={Presentation}
                    trend="+12%"
                    color="blue"
                />
                <StatsCard
                    title="Avg Engagement"
                    value={`${(data.performance.avg_engagement * 100).toFixed(0)}%`}
                    icon={Activity}
                    trend="+5%"
                    color="green"
                />
                <StatsCard
                    title="Participants"
                    value={data.performance.total_participants}
                    icon={Users}
                    trend="+23"
                    color="purple"
                />
                <StatsCard
                    title="Use Cases"
                    value={data.performance.total_usecases || 0}
                    icon={Target}
                    trend="+8"
                    color="orange"
                />
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trend Chart */}
                <div className="theme-bg-secondary p-6 rounded-xl shadow-sm border theme-border">
                    <h3 className="text-lg font-semibold mb-6 theme-text-primary flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-500" />
                        Activity Trends
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.recent_trend}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Distribution */}
                <div className="theme-bg-secondary p-6 rounded-xl shadow-sm border theme-border">
                    <h3 className="text-lg font-semibold mb-6 theme-text-primary flex items-center gap-2">
                        <Award size={20} className="text-purple-500" />
                        Top Categories
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.categories}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="count"
                                >
                                    {data.categories.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Benchmarks Section */}
            {benchmarks && (
                <div className="theme-bg-secondary p-6 rounded-xl shadow-sm border theme-border">
                    <h3 className="text-lg font-semibold mb-6 theme-text-primary flex items-center gap-2">
                        <Target size={20} className="text-green-500" />
                        Industry Benchmarks ({benchmarks.industry})
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs theme-text-secondary uppercase theme-bg-tertiary">
                                <tr>
                                    <th className="px-6 py-3 rounded-l-lg">Metric</th>
                                    <th className="px-6 py-3">Your Score</th>
                                    <th className="px-6 py-3">Industry Avg</th>
                                    <th className="px-6 py-3 rounded-r-lg">Percentile</th>
                                </tr>
                            </thead>
                            <tbody>
                                {benchmarks.metrics.map((metric) => (
                                    <tr key={metric.metric_name} className="theme-bg-secondary border-b theme-border">
                                        <td className="px-6 py-4 font-medium theme-text-primary">
                                            {metric.metric_name}
                                        </td>
                                        <td className="px-6 py-4 text-blue-600 font-semibold">
                                            {metric.your_value.toFixed(1)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {metric.industry_avg.toFixed(1)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 bg-gray-200 rounded-full h-2.5 theme-bg-tertiary">
                                                    <div
                                                        className="bg-blue-600 h-2.5 rounded-full"
                                                        style={{ width: `${metric.percentile}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-medium theme-text-secondary">{metric.percentile}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatsCard = ({ title, value, icon: Icon, trend, color }: any) => {
    const colorClasses = {
        blue: 'theme-badge-info',
        green: 'theme-badge-success',
        purple: 'theme-badge-warning', // Using warning for purple/users as fallback or custom
        orange: 'theme-badge-danger',
    };

    return (
        <div className="theme-bg-secondary p-6 rounded-xl shadow-sm border theme-border">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium theme-text-secondary mb-1">{title}</p>
                    <h3 className="text-2xl font-bold theme-text-primary">{value}</h3>
                </div>
                <div className={`p-2 rounded-lg ${(colorClasses as any)[color]}`}>
                    <Icon size={20} />
                </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
                <span className="text-green-500 flex items-center font-medium">
                    <ArrowUpRight size={16} className="mr-1" />
                    {trend}
                </span>
                <span className="theme-text-muted ml-2">vs last month</span>
            </div>
        </div>
    );
};
