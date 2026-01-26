import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toast } from 'sonner';

interface HeatmapRow {
    participant_id: string;
    participant_name: string;
    scores: Record<string, number | null>;
}

interface HeatmapData {
    workshop_id: string;
    criteria: string[];
    heatmap: HeatmapRow[];
    participant_count: number;
}

interface VotingHeatmapProps {
    workshopId: string;
}

export function VotingHeatmap({ workshopId }: VotingHeatmapProps) {
    const [data, setData] = useState<HeatmapData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHeatmapData();
    }, [workshopId]);

    const fetchHeatmapData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/analytics/workshop/${workshopId}/heatmap`);
            setData(response.data);
        } catch (error) {
            console.error('Failed to fetch heatmap data:', error);
            toast.error('Failed to load heatmap data');
        } finally {
            setLoading(false);
        }
    };

    const getColorForScore = (score: number | null): string => {
        if (score === null) return 'theme-bg-tertiary';

        // Color scale from red (low) to yellow (mid) to green (high)
        if (score <= 3) {
            return 'bg-red-600/70';
        } else if (score <= 5) {
            return 'bg-orange-500/70';
        } else if (score <= 7) {
            return 'bg-yellow-500/70';
        } else {
            return 'bg-green-500/70';
        }
    };

    const getTextColor = (score: number | null): string => {
        if (score === null) return 'theme-text-muted';
        return 'text-white';
    };

    if (loading) {
        return (
            <div className="theme-bg-secondary rounded-xl p-6 border theme-border">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 theme-bg-tertiary rounded w-1/3"></div>
                    <div className="h-64 theme-bg-tertiary rounded"></div>
                </div>
            </div>
        );
    }

    if (!data || data.heatmap.length === 0) {
        return (
            <div className="theme-bg-secondary rounded-xl p-6 border theme-border">
                <h3 className="text-lg font-bold mb-4 theme-text-primary">Voting Heatmap</h3>
                <p className="theme-text-secondary text-center py-8">No voting data available</p>
            </div>
        );
    }

    return (
        <div className="theme-bg-secondary rounded-xl p-6 border theme-border">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold theme-text-primary">Voting Heatmap</h3>
                <span className="text-sm theme-text-secondary">
                    {data.participant_count} participants
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className="text-left p-2 theme-text-secondary font-medium sticky left-0 theme-bg-secondary z-10">
                                Participant
                            </th>
                            {data.criteria.map((criterion) => (
                                <th
                                    key={criterion}
                                    className="p-2 theme-text-secondary font-medium text-center min-w-[80px]"
                                    title={criterion}
                                >
                                    <span className="truncate block max-w-[80px]">
                                        {criterion.length > 12 ? criterion.slice(0, 10) + '...' : criterion}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.heatmap.map((row) => (
                            <tr key={row.participant_id} className="border-t theme-border">
                                <td className="p-2 font-medium sticky left-0 theme-bg-secondary z-10 theme-text-primary">
                                    {row.participant_name}
                                </td>
                                {data.criteria.map((criterion) => {
                                    const score = row.scores[criterion];
                                    return (
                                        <td
                                            key={criterion}
                                            className={`p-2 text-center ${getColorForScore(score)} ${getTextColor(score)} transition-colors`}
                                        >
                                            {score !== null ? score.toFixed(1) : '-'}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs theme-text-secondary">
                <span>Score Legend:</span>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-red-600/70 rounded"></div>
                    <span>1-3</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-orange-500/70 rounded"></div>
                    <span>4-5</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-yellow-500/70 rounded"></div>
                    <span>6-7</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-green-500/70 rounded"></div>
                    <span>8-10</span>
                </div>
            </div>
        </div>
    );
}
