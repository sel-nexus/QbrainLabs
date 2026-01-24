import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { VotingHeatmap } from './VotingHeatmap';
import { 
    BarChart3, 
    PieChart, 
    TrendingUp, 
    Users, 
    CheckCircle2, 
    Download,
    FileText
} from 'lucide-react';
import { Button } from './ui/Button';

interface AgreementData {
    use_case_id: string;
    title: string;
    vote_count: number;
    overall_agreement: number;
    consensus_level: string;
    criteria_agreement: Record<string, {
        mean: number;
        std_dev: number;
        variance: number;
        agreement_score: number;
    }>;
}

interface QuadrantData {
    quadrants: {
        quick_wins: any[];
        strategic_bets: any[];
        nice_to_have: any[];
        dont_do: any[];
    };
    summary: {
        quick_wins_count: number;
        strategic_bets_count: number;
        nice_to_have_count: number;
        dont_do_count: number;
        total_use_cases: number;
    };
}

interface DistributionData {
    distributions: Record<string, {
        histogram: number[];
        mean: number;
        median: number;
        std_dev: number;
    }>;
}

interface AnalyticsDashboardProps {
    workshopId: string;
    workshopTitle?: string;
}

export function AnalyticsDashboard({ workshopId, workshopTitle }: AnalyticsDashboardProps) {
    const [agreementData, setAgreementData] = useState<{ use_cases: AgreementData[], summary: any } | null>(null);
    const [quadrantData, setQuadrantData] = useState<QuadrantData | null>(null);
    const [distributionData, setDistributionData] = useState<DistributionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'agreement' | 'distribution'>('overview');

    useEffect(() => {
        fetchAllAnalytics();
    }, [workshopId]);

    const fetchAllAnalytics = async () => {
        setLoading(true);
        try {
            const [agreementRes, quadrantRes, distributionRes] = await Promise.all([
                api.get(`/analytics/workshop/${workshopId}/agreement`),
                api.get(`/analytics/workshop/${workshopId}/quadrant-analysis`),
                api.get(`/analytics/workshop/${workshopId}/distribution`)
            ]);
            
            setAgreementData(agreementRes.data);
            setQuadrantData(quadrantRes.data);
            setDistributionData(distributionRes.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const exportPDF = async () => {
        try {
            const response = await api.get(`/export/workshop/${workshopId}/pdf`, {
                responseType: 'blob'
            });
            
            // Create blob and download
            const blob = new Blob([response.data], { type: 'text/html' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `workshop_report_${workshopId}.html`;
            link.click();
            window.URL.revokeObjectURL(url);
            
            toast.success('Report downloaded! Open in browser and print to PDF.');
        } catch (error) {
            console.error('Failed to export PDF:', error);
            toast.error('Failed to export report');
        }
    };

    const exportCSV = async () => {
        try {
            const response = await api.get(`/export/workshop/${workshopId}/csv`, {
                responseType: 'blob'
            });
            
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `workshop_results_${workshopId}.csv`;
            link.click();
            window.URL.revokeObjectURL(url);
            
            toast.success('CSV exported successfully');
        } catch (error) {
            console.error('Failed to export CSV:', error);
            toast.error('Failed to export CSV');
        }
    };

    const getConsensusColor = (level: string) => {
        switch (level) {
            case 'High': return 'text-green-400 bg-green-400/10';
            case 'Medium': return 'text-yellow-400 bg-yellow-400/10';
            case 'Low': return 'text-red-400 bg-red-400/10';
            default: return 'text-gray-400 bg-gray-400/10';
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-32 bg-surface-800 rounded-xl"></div>
                <div className="h-64 bg-surface-800 rounded-xl"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
                    {workshopTitle && (
                        <p className="text-gray-400 text-sm">{workshopTitle}</p>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={exportCSV}>
                        <Download className="w-4 h-4 mr-2" />
                        CSV
                    </Button>
                    <Button onClick={exportPDF}>
                        <FileText className="w-4 h-4 mr-2" />
                        PDF Report
                    </Button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-white/10 pb-2">
                {[
                    { id: 'overview', label: 'Overview', icon: PieChart },
                    { id: 'heatmap', label: 'Heatmap', icon: BarChart3 },
                    { id: 'agreement', label: 'Consensus', icon: Users },
                    { id: 'distribution', label: 'Distribution', icon: TrendingUp }
                ].map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id as any)}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                            activeTab === id
                                ? 'bg-brand-violet text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && quadrantData && agreementData && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-surface-800 p-4 rounded-xl border border-white/10">
                            <div className="text-3xl font-bold text-green-400">
                                {quadrantData.summary.quick_wins_count}
                            </div>
                            <div className="text-sm text-gray-400">Quick Wins</div>
                        </div>
                        <div className="bg-surface-800 p-4 rounded-xl border border-white/10">
                            <div className="text-3xl font-bold text-brand-violet">
                                {quadrantData.summary.strategic_bets_count}
                            </div>
                            <div className="text-sm text-gray-400">Strategic Bets</div>
                        </div>
                        <div className="bg-surface-800 p-4 rounded-xl border border-white/10">
                            <div className="text-3xl font-bold text-blue-400">
                                {quadrantData.summary.nice_to_have_count}
                            </div>
                            <div className="text-sm text-gray-400">Nice to Have</div>
                        </div>
                        <div className="bg-surface-800 p-4 rounded-xl border border-white/10">
                            <div className="text-3xl font-bold text-gray-400">
                                {quadrantData.summary.dont_do_count}
                            </div>
                            <div className="text-sm text-gray-400">Deprioritize</div>
                        </div>
                    </div>

                    {/* Consensus Summary */}
                    <div className="bg-surface-800 p-6 rounded-xl border border-white/10">
                        <h3 className="text-lg font-bold mb-4">Consensus Summary</h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center p-4 bg-green-400/10 rounded-lg">
                                <div className="text-2xl font-bold text-green-400">
                                    {agreementData.summary.high_consensus_count}
                                </div>
                                <div className="text-xs text-gray-400">High Agreement</div>
                            </div>
                            <div className="text-center p-4 bg-yellow-400/10 rounded-lg">
                                <div className="text-2xl font-bold text-yellow-400">
                                    {agreementData.summary.medium_consensus_count}
                                </div>
                                <div className="text-xs text-gray-400">Moderate</div>
                            </div>
                            <div className="text-center p-4 bg-red-400/10 rounded-lg">
                                <div className="text-2xl font-bold text-red-400">
                                    {agreementData.summary.low_consensus_count}
                                </div>
                                <div className="text-xs text-gray-400">Needs Discussion</div>
                            </div>
                        </div>
                        <div className="text-center text-sm text-gray-400">
                            Average Agreement: <span className="text-white font-bold">{agreementData.summary.avg_agreement}%</span>
                        </div>
                    </div>

                    {/* Top Recommendations */}
                    <div className="bg-surface-800 p-6 rounded-xl border border-white/10">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                            Top Quick Wins
                        </h3>
                        <div className="space-y-3">
                            {quadrantData.quadrants.quick_wins.slice(0, 5).map((uc, idx) => (
                                <div key={uc.id} className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-400 font-bold">#{idx + 1}</span>
                                        <span className="font-medium">{uc.title}</span>
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        V: {uc.y} | F: {uc.x}
                                    </div>
                                </div>
                            ))}
                            {quadrantData.quadrants.quick_wins.length === 0 && (
                                <p className="text-gray-400 text-center py-4">No quick wins identified yet</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Heatmap Tab */}
            {activeTab === 'heatmap' && (
                <VotingHeatmap workshopId={workshopId} />
            )}

            {/* Agreement Tab */}
            {activeTab === 'agreement' && agreementData && (
                <div className="bg-surface-800 p-6 rounded-xl border border-white/10">
                    <h3 className="text-lg font-bold mb-4">Consensus Analysis</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-gray-400 text-sm">
                                    <th className="p-3">Use Case</th>
                                    <th className="p-3">Votes</th>
                                    <th className="p-3">Agreement</th>
                                    <th className="p-3">Consensus</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agreementData.use_cases.map((item) => (
                                    <tr key={item.use_case_id} className="border-t border-white/5">
                                        <td className="p-3 font-medium">{item.title}</td>
                                        <td className="p-3 text-gray-400">{item.vote_count}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 bg-surface-700 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${
                                                            item.overall_agreement >= 70 ? 'bg-green-400' :
                                                            item.overall_agreement >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                                                        }`}
                                                        style={{ width: `${item.overall_agreement}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm">{item.overall_agreement}%</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getConsensusColor(item.consensus_level)}`}>
                                                {item.consensus_level}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Distribution Tab */}
            {activeTab === 'distribution' && distributionData && (
                <div className="space-y-6">
                    {Object.entries(distributionData.distributions).map(([criterion, data]) => (
                        <div key={criterion} className="bg-surface-800 p-6 rounded-xl border border-white/10">
                            <h4 className="font-bold mb-4">{criterion}</h4>
                            
                            {/* Histogram visualization */}
                            <div className="flex items-end gap-1 h-32 mb-4">
                                {data.histogram.map((count, idx) => {
                                    const maxCount = Math.max(...data.histogram, 1);
                                    const height = (count / maxCount) * 100;
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center">
                                            <div 
                                                className="w-full bg-brand-violet rounded-t transition-all"
                                                style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                                                title={`${idx}-${idx+1}: ${count} votes`}
                                            />
                                            <span className="text-xs text-gray-500 mt-1">{idx}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-400">Mean:</span>
                                    <span className="ml-2 font-bold">{data.mean}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">Median:</span>
                                    <span className="ml-2 font-bold">{data.median}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">Std Dev:</span>
                                    <span className="ml-2 font-bold">{data.std_dev}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">Total:</span>
                                    <span className="ml-2 font-bold">{data.histogram.reduce((a, b) => a + b, 0)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
