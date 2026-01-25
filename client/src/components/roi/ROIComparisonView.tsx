import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { ROICalculation } from '../../types/roi';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Loader2, TrendingUp, DollarSign } from 'lucide-react';

interface ROIComparisonViewProps {
    workshopId: string;
    useCases: any[];
}

export const ROIComparisonView: React.FC<ROIComparisonViewProps> = ({ workshopId, useCases }) => {
    const [roiData, setRoiData] = useState<ROICalculation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchROIs = async () => {
            try {
                const response = await api.get(`/roi/workshops/${workshopId}`);
                setRoiData(response.data);
            } catch (error) {
                console.error("Failed to fetch workshop ROIs", error);
            } finally {
                setLoading(false);
            }
        };
        fetchROIs();
    }, [workshopId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (roiData.length === 0) {
        return (
            <div className="text-center p-12 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-300 dark:border-white/10">
                <p className="text-gray-500">No ROI analyses completed yet.</p>
                <p className="text-sm text-gray-400 mt-1">Calculate ROI for individual use cases to see a portfolio comparison.</p>
            </div>
        );
    }

    // Merge use case titles into ROI data
    const comparisonData = roiData.map(roi => {
        const uc = useCases.find(u => u.id === roi.use_case_id);
        return {
            title: uc?.title || 'Unknown',
            roi: roi.results.roi_percent,
            payback: roi.results.payback_months,
            tco: roi.results.tco,
            npv: roi.results.npv
        };
    }).sort((a, b) => b.roi - a.roi);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ROI % Comparison */}
                <div className="bg-white dark:bg-surface-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                        ROI % by Use Case
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                <XAxis type="number" stroke="#9CA3AF" />
                                <YAxis dataKey="title" type="category" stroke="#9CA3AF" width={100} tick={{ fontSize: 10 }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(243, 244, 246, 0.4)' }}
                                    contentStyle={{ backgroundColor: '#1F2937', color: '#F9FAFB', border: 'none', borderRadius: '8px' }}
                                />
                                <Bar dataKey="roi" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* TCO vs NPV Scatter */}
                <div className="bg-white dark:bg-surface-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-6 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        TCO vs NPV (Size = ROI)
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis type="number" dataKey="tco" name="TCO" unit="$" stroke="#9CA3AF" label={{ value: 'TCO', position: 'bottom', offset: 0 }} />
                                <YAxis type="number" dataKey="npv" name="NPV" unit="$" stroke="#9CA3AF" label={{ value: 'NPV', angle: -90, position: 'insideLeft' }} />
                                <ZAxis type="number" dataKey="roi" range={[100, 1000]} name="ROI" unit="%" />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                <Scatter name="Use Cases" data={comparisonData} fill="#10B981" />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Ranking Table */}
            <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-white/5 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                            <th className="px-6 py-4">Ranking</th>
                            <th className="px-6 py-4">Use Case</th>
                            <th className="px-6 py-4 text-right">ROI %</th>
                            <th className="px-6 py-4 text-right">Payback (Mo)</th>
                            <th className="px-6 py-4 text-right">NPV</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {comparisonData.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-mono text-indigo-600 font-bold">#{idx + 1}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{item.title}</td>
                                <td className="px-6 py-4 text-right font-bold text-green-600">{item.roi}%</td>
                                <td className="px-6 py-4 text-right">{item.payback}</td>
                                <td className="px-6 py-4 text-right font-mono">${item.npv.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
