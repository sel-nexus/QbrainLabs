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
        if (score === null) return 'bg-gray-800';
        
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
        if (score === null) return 'text-gray-500';
        return 'text-white';
    };

    if (loading) {
        return (
            <div className="bg-surface-800 rounded-xl p-6 border border-white/10">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-surface-700 rounded w-1/3"></div>
                    <div className="h-64 bg-surface-700 rounded"></div>
                </div>
            </div>
        );
    }

    if (!data || data.heatmap.length === 0) {
        return (
            <div className="bg-surface-800 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-bold mb-4">Voting Heatmap</h3>
                <p className="text-gray-400 text-center py-8">No voting data available</p>
            </div>
        );
    }

    return (
        <div className="bg-surface-800 rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Voting Heatmap</h3>
                <span className="text-sm text-gray-400">
                    {data.participant_count} participants
                </span>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className="text-left p-2 text-gray-400 font-medium sticky left-0 bg-surface-800 z-10">
                                Participant
                            </th>
                            {data.criteria.map((criterion) => (
                                <th 
                                    key={criterion} 
                                    className="p-2 text-gray-400 font-medium text-center min-w-[80px]"
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
                            <tr key={row.participant_id} className="border-t border-white/5">
                                <td className="p-2 font-medium sticky left-0 bg-surface-800 z-10">
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
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
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
