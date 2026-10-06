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

        // Unified 1-100 scaling
        const scaleMax = 100;

        // Handle legacy 1-10 data for heatmap coloring
        let effectiveScore = score;
        if (score > 0 && score <= 10) {
            // Check if heatmap has any scores > 10 to decide if this is legacy
            const allScores = data?.heatmap.flatMap(row => Object.values(row.scores)).filter((s): s is number => s !== null) || [];
            if (allScores.every(s => s <= 10)) {
                effectiveScore = score * 10;
            }
        }

        const normalizedScore = (effectiveScore / scaleMax) * 10;

        // Color scale from red (low) to yellow (mid) to green (high)
        if (normalizedScore <= 3) {
            return 'bg-red-600/70';
        } else if (normalizedScore <= 5) {
            return 'bg-orange-500/70';
        } else if (normalizedScore <= 7) {
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
                <h3 className="text-lg font-bold mb-4 theme-text-primary">Score heatmap</h3>
                <p className="theme-text-secondary text-center py-8">No voting data available</p>
            </div>
        );
    }

    return (
        <div className="theme-bg-secondary rounded-xl p-6 border theme-border">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold theme-text-primary">Score heatmap</h3>
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
                {(() => {
                    const isScale100 = true; // Force unified scale in legend
                    const scaleMax = 100;
                    const step = scaleMax / 10;

                    const formatScore = (s: number) => {
                        if (isScale100) {
                            return s.toFixed(0); // For 100-point scale, show as integer
                        }
                        return s.toFixed(1); // For 10-point scale, show one decimal
                    };

                    return (
                        <>
                            <div className="flex items-center gap-1">
                                <div className="w-4 h-4 bg-red-600/70 rounded"></div>
                                <span>{`${formatScore(0.1)}-${formatScore(3 * step)}`}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-4 h-4 bg-orange-500/70 rounded"></div>
                                <span>{`${3 * step + 1}-${5 * step}`}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-4 h-4 bg-yellow-500/70 rounded"></div>
                                <span>{`${5 * step + 1}-${7 * step}`}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-4 h-4 bg-green-500/70 rounded"></div>
                                <span>{`${7 * step + 1}-${10 * step}`}</span>
                            </div>
                        </>
                    );
                })()}
            </div>
        </div>
    );
}
