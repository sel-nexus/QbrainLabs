import React, { useState, useEffect } from 'react';
import type { CostInputs, BenefitInputs, ROIParameters, ROIResults } from '../../types/roi';
import { api } from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface SensitivityData {
    variable: string;
    category: string;
    baseValue: number;
    impact: number;
    lowROI: number;
    highROI: number;
}

interface SensitivityAnalysisProps {
    costs: CostInputs;
    benefits: BenefitInputs;
    parameters: ROIParameters;
    baseResults: ROIResults;
}

export const SensitivityAnalysis: React.FC<SensitivityAnalysisProps> = ({
    costs,
    benefits,
    parameters,
    baseResults
}) => {
    const [sensitivityData, setSensitivityData] = useState<SensitivityData[]>([]);
    const [loading, setLoading] = useState(false);
    const [variancePercent, setVariancePercent] = useState(20);

    useEffect(() => {
        calculateSensitivity();
    }, [costs, benefits, parameters, variancePercent]);

    const calculateSensitivity = async () => {
        setLoading(true);
        try {
            const results: SensitivityData[] = [];

            // Test each cost variable
            for (const [key, baseValue] of Object.entries(costs)) {
                if (typeof baseValue !== 'number' || baseValue === 0) continue;

                const variance = variancePercent / 100;

                // Calculate with increased value
                const highCosts = { ...costs, [key]: baseValue * (1 + variance) };
                const highResponse = await api.post('roi/calculate-only', {
                    costs: highCosts,
                    benefits,
                    parameters
                });
                const highROI = highResponse.data.roi_percent;

                // Calculate with decreased value
                const lowCosts = { ...costs, [key]: baseValue * (1 - variance) };
                const lowResponse = await api.post('roi/calculate-only', {
                    costs: lowCosts,
                    benefits,
                    parameters
                });
                const lowROI = lowResponse.data.roi_percent;

                const impact = Math.abs(highROI - lowROI);

                results.push({
                    variable: key.replace(/_/g, ' '),
                    category: 'cost',
                    baseValue,
                    impact,
                    lowROI,
                    highROI
                });
            }

            // Test each benefit variable
            for (const [key, baseValue] of Object.entries(benefits)) {
                if (typeof baseValue !== 'number' || baseValue === 0) continue;

                const variance = variancePercent / 100;

                const highBenefits = { ...benefits, [key]: baseValue * (1 + variance) };
                const highResponse = await api.post('roi/calculate-only', {
                    costs,
                    benefits: highBenefits,
                    parameters
                });
                const highROI = highResponse.data.roi_percent;

                const lowBenefits = { ...benefits, [key]: baseValue * (1 - variance) };
                const lowResponse = await api.post('/roi/calculate-only', {
                    costs,
                    benefits: lowBenefits,
                    parameters
                });
                const lowROI = lowResponse.data.roi_percent;

                const impact = Math.abs(highROI - lowROI);

                results.push({
                    variable: key.replace(/_/g, ' '),
                    category: 'benefit',
                    baseValue,
                    impact,
                    lowROI,
                    highROI
                });
            }

            // Sort by impact (descending)
            results.sort((a, b) => b.impact - a.impact);
            setSensitivityData(results.slice(0, 10)); // Top 10 most impactful

        } catch (error) {
            console.error('Sensitivity analysis failed:', error);
        } finally {
            setLoading(false);
        }
    };

    // Prepare tornado chart data
    const tornadoData = sensitivityData.map(item => ({
        variable: item.variable,
        negative: -(item.lowROI - baseResults.roi_percent),
        positive: item.highROI - baseResults.roi_percent,
        impact: item.impact
    }));

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sensitivity Analysis</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Impact of ±{variancePercent}% change in each variable on ROI
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Variance:</label>
                    <select
                        value={variancePercent}
                        onChange={(e) => setVariancePercent(parseInt(e.target.value))}
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value={10}>±10%</option>
                        <option value={20}>±20%</option>
                        <option value={30}>±30%</option>
                        <option value={50}>±50%</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Tornado Diagram */}
                    <div className="mb-8">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                            Tornado Diagram (ROI Impact)
                        </h4>
                        <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={tornadoData}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                    <XAxis
                                        type="number"
                                        domain={['dataMin', 'dataMax']}
                                        stroke="#9CA3AF"
                                        tickFormatter={(val) => `${val > 0 ? '+' : ''}${val.toFixed(1)}%`}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="variable"
                                        stroke="#9CA3AF"
                                        width={140}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <Tooltip
                                        formatter={(value: number | string | undefined) => {
                                            if (value === undefined) return '';
                                            const numValue = typeof value === 'string' ? parseFloat(value) : value;
                                            return `${numValue > 0 ? '+' : ''}${numValue.toFixed(2)}%`;
                                        }}
                                        contentStyle={{
                                            backgroundColor: '#1F2937',
                                            color: '#F9FAFB',
                                            border: 'none',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Bar dataKey="negative" fill="#EF4444" stackId="stack" />
                                    <Bar dataKey="positive" fill="#10B981" stackId="stack" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-red-500 rounded" />
                                <span className="text-gray-600 dark:text-gray-400">Downside Risk (-{variancePercent}%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-500 rounded" />
                                <span className="text-gray-600 dark:text-gray-400">Upside Potential (+{variancePercent}%)</span>
                            </div>
                        </div>
                    </div>

                    {/* Variable Impact Table */}
                    <div className="overflow-x-auto">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                            Ranked Variable Impact
                        </h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                                    <th className="px-4 py-3 text-left">Variable</th>
                                    <th className="px-4 py-3 text-left">Category</th>
                                    <th className="px-4 py-3 text-right">Base Value</th>
                                    <th className="px-4 py-3 text-right">ROI Range</th>
                                    <th className="px-4 py-3 text-right">Total Impact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {sensitivityData.map((item, idx) => (
                                    <tr
                                        key={idx}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white capitalize">
                                            {item.variable}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`px-2 py-1 text-xs font-medium rounded-full ${item.category === 'cost'
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    }`}
                                            >
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                                            {item.variable.includes('rate') || item.variable.includes('pct')
                                                ? item.baseValue.toFixed(2)
                                                : `$${item.baseValue.toLocaleString()}`}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="text-red-600 dark:text-red-400 font-medium">
                                                    {item.lowROI.toFixed(1)}%
                                                </span>
                                                <span className="text-gray-400">→</span>
                                                <span className="text-green-600 dark:text-green-400 font-medium">
                                                    {item.highROI.toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {item.impact.toFixed(1)}%
                                                </span>
                                                {idx < 3 && (
                                                    <TrendingUp className="w-4 h-4 text-amber-500" />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Key Insights */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-amber-600" />
                            Key Insights
                        </h4>
                        <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                            {sensitivityData.slice(0, 3).map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                    <span className="text-amber-600 font-bold">{idx + 1}.</span>
                                    <span>
                                        <strong className="capitalize">{item.variable}</strong> has the highest impact
                                        ({item.impact.toFixed(1)}% ROI swing). Focus on accurate estimation here.
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
};
