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
} from 'lucide-react';
import { CONSENSUS_LABELS, QUADRANT_LABELS, toConsensusLevel } from '../lib/results';

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
    x_label?: string;
    y_label?: string;
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

    const consensusBadge = (level: string) => {
        const key = toConsensusLevel(level);
        return key
            ? { className: { high: 'theme-badge-success', moderate: 'theme-badge-warning', needs_discussion: 'theme-badge-danger' }[key], label: CONSENSUS_LABELS[key] }
            : { className: 'theme-badge-neutral', label: level };
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-32 theme-bg-secondary rounded-xl"></div>
                <div className="h-64 theme-bg-secondary rounded-xl"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold theme-text-primary">Analytics Dashboard</h2>
                    {workshopTitle && (
                        <p className="theme-text-secondary text-sm">{workshopTitle}</p>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b theme-border pb-2">
                {[
                    { id: 'overview', label: 'Overview', icon: PieChart },
                    { id: 'heatmap', label: 'Heatmap', icon: BarChart3 },
                    { id: 'agreement', label: 'Consensus', icon: Users },
                    { id: 'distribution', label: 'Distribution', icon: TrendingUp }
                ].map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id as any)}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${activeTab === id
                                ? 'bg-brand-violet text-white'
                                : 'theme-text-secondary hover:theme-text-primary hover:theme-hover-bg'
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
                        <div className="theme-bg-secondary p-4 rounded-xl border theme-border">
                            <div className="text-3xl font-bold text-semantic-success">
                                {quadrantData.summary.quick_wins_count}
                            </div>
                            <div className="text-sm theme-text-secondary">{QUADRANT_LABELS.quick_wins}</div>
                        </div>
                        <div className="theme-bg-secondary p-4 rounded-xl border theme-border">
                            <div className="text-3xl font-bold text-brand-violet">
                                {quadrantData.summary.strategic_bets_count}
                            </div>
                            <div className="text-sm theme-text-secondary">{QUADRANT_LABELS.strategic_bets}</div>
                        </div>
                        <div className="theme-bg-secondary p-4 rounded-xl border theme-border">
                            <div className="text-3xl font-bold text-semantic-info">
                                {quadrantData.summary.nice_to_have_count}
                            </div>
                            <div className="text-sm theme-text-secondary">{QUADRANT_LABELS.nice_to_have}</div>
                        </div>
                        <div className="theme-bg-secondary p-4 rounded-xl border theme-border">
                            <div className="text-3xl font-bold theme-text-muted">
                                {quadrantData.summary.dont_do_count}
                            </div>
                            <div className="text-sm theme-text-secondary">{QUADRANT_LABELS.dont_do}</div>
                        </div>
                    </div>

                    {/* Consensus Summary */}
                    <div className="theme-bg-secondary p-6 rounded-xl border theme-border">
                        <h3 className="text-lg font-bold mb-4 theme-text-primary">Consensus Summary</h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center p-4 theme-badge-success rounded-lg">
                                <div className="text-2xl font-bold">
                                    {agreementData.summary.high_consensus_count}
                                </div>
                                <div className="text-xs opacity-80">{CONSENSUS_LABELS.high}</div>
                            </div>
                            <div className="text-center p-4 theme-badge-warning rounded-lg">
                                <div className="text-2xl font-bold">
                                    {agreementData.summary.medium_consensus_count}
                                </div>
                                <div className="text-xs opacity-80">{CONSENSUS_LABELS.moderate}</div>
                            </div>
                            <div className="text-center p-4 theme-badge-danger rounded-lg">
                                <div className="text-2xl font-bold">
                                    {agreementData.summary.low_consensus_count}
                                </div>
                                <div className="text-xs opacity-80">{CONSENSUS_LABELS.needs_discussion}</div>
                            </div>
                        </div>
                        <div className="text-center text-sm theme-text-secondary">
                            Average Agreement: <span className="theme-text-primary font-bold">{agreementData.summary.avg_agreement}%</span>
                        </div>
                    </div>

                    {/* Top Recommendations */}
                    <div className="theme-bg-secondary p-6 rounded-xl border theme-border">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 theme-text-primary">
                            <CheckCircle2 className="w-5 h-5 theme-success-text" />
                            Top {QUADRANT_LABELS.quick_wins.toLowerCase()}
                        </h3>
                        <div className="space-y-3">
                            {quadrantData.quadrants.quick_wins.slice(0, 5).map((uc, idx) => (
                                <div key={uc.id} className="flex items-center justify-between p-3 theme-bg-tertiary rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="theme-success-text font-bold">{uc.rank ? `#${uc.rank}` : `#${idx + 1}`}</span>
                                        <span className="font-medium theme-text-primary">{uc.title}</span>
                                    </div>
                                    <div className="text-sm theme-text-secondary">
                                        {quadrantData.y_label || 'Y'}: {Math.round(uc.y)} · {quadrantData.x_label || 'X'}: {Math.round(uc.x)}
                                    </div>
                                </div>
                            ))}
                            {quadrantData.quadrants.quick_wins.length === 0 && (
                                <p className="theme-text-secondary text-center py-4">No {QUADRANT_LABELS.quick_wins.toLowerCase()} identified yet</p>
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
                <div className="theme-bg-secondary p-6 rounded-xl border theme-border">
                    <h3 className="text-lg font-bold mb-4 theme-text-primary">Consensus Analysis</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left theme-text-secondary text-sm">
                                    <th className="p-3">Use Case</th>
                                    <th className="p-3">Votes</th>
                                    <th className="p-3">Agreement</th>
                                    <th className="p-3">Consensus</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agreementData.use_cases.map((item) => (
                                    <tr key={item.use_case_id} className="border-t theme-border">
                                        <td className="p-3 font-medium theme-text-primary">{item.title}</td>
                                        <td className="p-3 theme-text-secondary">{item.vote_count}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 theme-bg-tertiary rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${item.overall_agreement >= 70 ? 'bg-semantic-success' :
                                                                item.overall_agreement >= 40 ? 'bg-semantic-warning' : 'bg-semantic-danger'
                                                            }`}
                                                        style={{ width: `${item.overall_agreement}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm theme-text-primary">{item.overall_agreement}%</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${consensusBadge(item.consensus_level).className}`}>
                                                {consensusBadge(item.consensus_level).label}
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
                        <div key={criterion} className="theme-bg-secondary p-6 rounded-xl border theme-border">
                            <h4 className="font-bold mb-4 theme-text-primary">{criterion}</h4>

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
                                                title={`${idx}-${idx + 1}: ${count} votes`}
                                            />
                                            <span className="text-xs theme-text-muted mt-1">{idx}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="theme-text-secondary">Mean:</span>
                                    <span className="ml-2 font-bold theme-text-primary">{data.mean}</span>
                                </div>
                                <div>
                                    <span className="theme-text-secondary">Median:</span>
                                    <span className="ml-2 font-bold theme-text-primary">{data.median}</span>
                                </div>
                                <div>
                                    <span className="theme-text-secondary">Std Dev:</span>
                                    <span className="ml-2 font-bold theme-text-primary">{data.std_dev}</span>
                                </div>
                                <div>
                                    <span className="theme-text-secondary">Total:</span>
                                    <span className="ml-2 font-bold theme-text-primary">{data.histogram.reduce((a, b) => a + b, 0)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
