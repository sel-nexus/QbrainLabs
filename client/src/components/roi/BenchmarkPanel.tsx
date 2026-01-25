import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Award, TrendingUp, Database, AlertCircle } from 'lucide-react';

interface Benchmark {
    id: string;
    use_case_type: string;
    industry: string;
    company_size: string;
    metric_name: string;
    metric_value: {
        min?: number;
        max?: number;
        avg?: number;
        median?: number;
    };
    source: string;
    year: number;
}

interface BenchmarkPanelProps {
    useCaseType?: string;
    industry?: string;
    currentROI: number;
    currentPayback: number;
}

export const BenchmarkPanel: React.FC<BenchmarkPanelProps> = ({
    useCaseType = 'AI Implementation',
    industry = 'Technology',
    currentROI,
    currentPayback
}) => {
    const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMetric, setSelectedMetric] = useState<'roi' | 'payback'>('roi');

    useEffect(() => {
        fetchBenchmarks();
    }, [useCaseType, industry]);

    const fetchBenchmarks = async () => {
        setLoading(true);
        try {
            // Mock data for now - in production, this would hit a real API
            const mockBenchmarks: Benchmark[] = [
                {
                    id: '1',
                    use_case_type: 'AI Implementation',
                    industry: 'Technology',
                    company_size: 'Enterprise',
                    metric_name: 'ROI',
                    metric_value: { min: 150, max: 400, avg: 250, median: 220 },
                    source: 'Gartner AI Survey 2025',
                    year: 2025
                },
                {
                    id: '2',
                    use_case_type: 'AI Implementation',
                    industry: 'Technology',
                    company_size: 'Mid-Market',
                    metric_name: 'ROI',
                    metric_value: { min: 100, max: 300, avg: 180, median: 160 },
                    source: 'McKinsey Digital Report 2025',
                    year: 2025
                },
                {
                    id: '3',
                    use_case_type: 'AI Implementation',
                    industry: 'Healthcare',
                    company_size: 'Enterprise',
                    metric_name: 'ROI',
                    metric_value: { min: 120, max: 350, avg: 210, median: 190 },
                    source: 'Healthcare IT Benchmarks 2025',
                    year: 2025
                },
                {
                    id: '4',
                    use_case_type: 'AI Implementation',
                    industry: 'Technology',
                    company_size: 'Enterprise',
                    metric_name: 'Payback Period',
                    metric_value: { min: 8, max: 24, avg: 14, median: 12 },
                    source: 'Gartner AI Survey 2025',
                    year: 2025
                }
            ];

            setBenchmarks(mockBenchmarks);
        } catch (error) {
            console.error('Failed to fetch benchmarks:', error);
        } finally {
            setLoading(false);
        }
    };

    const roiBenchmarks = benchmarks.filter(b => b.metric_name === 'ROI');
    const paybackBenchmarks = benchmarks.filter(b => b.metric_name === 'Payback Period');

    const activeBenchmarks = selectedMetric === 'roi' ? roiBenchmarks : paybackBenchmarks;
    const currentValue = selectedMetric === 'roi' ? currentROI : currentPayback;

    // Prepare chart data
    const chartData = activeBenchmarks.map(b => ({
        name: `${b.company_size}`,
        industry: b.industry,
        min: b.metric_value.min || 0,
        avg: b.metric_value.avg || 0,
        max: b.metric_value.max || 0,
        median: b.metric_value.median || 0,
        yours: currentValue
    }));

    const calculatePercentile = () => {
        if (activeBenchmarks.length === 0) return null;

        const avgBenchmark = activeBenchmarks[0]?.metric_value.avg || 0;
        
        if (selectedMetric === 'roi') {
            if (currentROI > avgBenchmark * 1.2) return { level: 'Top 25%', color: 'text-green-600', icon: Award };
            if (currentROI > avgBenchmark) return { level: 'Above Average', color: 'text-blue-600', icon: TrendingUp };
            if (currentROI > avgBenchmark * 0.8) return { level: 'Average', color: 'text-gray-600', icon: Database };
            return { level: 'Below Average', color: 'text-amber-600', icon: AlertCircle };
        } else {
            if (currentPayback < avgBenchmark * 0.8) return { level: 'Top 25%', color: 'text-green-600', icon: Award };
            if (currentPayback < avgBenchmark) return { level: 'Above Average', color: 'text-blue-600', icon: TrendingUp };
            if (currentPayback < avgBenchmark * 1.2) return { level: 'Average', color: 'text-gray-600', icon: Database };
            return { level: 'Below Average', color: 'text-amber-600', icon: AlertCircle };
        }
    };

    const percentile = calculatePercentile();
    const PercentileIcon = percentile?.icon;

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-indigo-600" />
                        Industry Benchmarks
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Compare your ROI against industry standards
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setSelectedMetric('roi')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            selectedMetric === 'roi'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        ROI %
                    </button>
                    <button
                        onClick={() => setSelectedMetric('payback')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            selectedMetric === 'payback'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        Payback
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Performance Badge */}
                    {percentile && PercentileIcon && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 ${percentile.color}`}>
                                    <PercentileIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Your Performance
                                    </p>
                                    <p className={`text-lg font-bold ${percentile.color}`}>
                                        {percentile.level}
                                    </p>
                                </div>
                                <div className="ml-auto text-right">
                                    <p className="text-sm text-gray-500">Your {selectedMetric === 'roi' ? 'ROI' : 'Payback'}</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {selectedMetric === 'roi' ? `${currentValue}%` : `${currentValue} mo`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Benchmark Chart */}
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                            Benchmark Comparison
                        </h4>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" stroke="#9CA3AF" />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1F2937',
                                            color: '#F9FAFB',
                                            border: 'none',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <ReferenceLine
                                        y={currentValue}
                                        stroke="#10B981"
                                        strokeDasharray="3 3"
                                        strokeWidth={2}
                                        label={{
                                            value: 'Your Value',
                                            fill: '#10B981',
                                            fontSize: 12,
                                            position: 'right'
                                        }}
                                    />
                                    <Bar dataKey="min" fill="#E5E7EB" name="Min" />
                                    <Bar dataKey="avg" fill="#4F46E5" name="Average" />
                                    <Bar dataKey="max" fill="#818CF8" name="Max" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Benchmark Details Table */}
                    <div className="overflow-x-auto">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                            Detailed Benchmarks
                        </h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                                    <th className="px-4 py-3 text-left">Industry</th>
                                    <th className="px-4 py-3 text-left">Company Size</th>
                                    <th className="px-4 py-3 text-right">Min</th>
                                    <th className="px-4 py-3 text-right">Average</th>
                                    <th className="px-4 py-3 text-right">Max</th>
                                    <th className="px-4 py-3 text-left">Source</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {activeBenchmarks.map((benchmark) => (
                                    <tr
                                        key={benchmark.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                            {benchmark.industry}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                            {benchmark.company_size}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-gray-600 dark:text-gray-400">
                                            {benchmark.metric_value.min}
                                            {selectedMetric === 'roi' ? '%' : ' mo'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                                            {benchmark.metric_value.avg}
                                            {selectedMetric === 'roi' ? '%' : ' mo'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-gray-600 dark:text-gray-400">
                                            {benchmark.metric_value.max}
                                            {selectedMetric === 'roi' ? '%' : ' mo'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">
                                            {benchmark.source} ({benchmark.year})
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {activeBenchmarks.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No benchmarks available for this metric.</p>
                            <p className="text-xs mt-1">Check back later for updated industry data.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
