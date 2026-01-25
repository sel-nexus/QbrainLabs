import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Users, AlertCircle, Activity, Loader2, RefreshCw } from 'lucide-react';
import { getEngagement } from '../../lib/api/copilot';
import type { EngagementResponse } from '../../lib/api/copilot';

interface EngagementMonitorProps {
    workshopId: string;
    className?: string;
}

export function EngagementMonitor({ workshopId, className = '' }: EngagementMonitorProps) {
    const { theme } = useTheme();
    const [engagement, setEngagement] = useState<EngagementResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEngagement = async () => {
        try {
            setError(null);
            const data = await getEngagement(workshopId);
            setEngagement(data);
        } catch (err) {
            setError('Failed to load engagement data');
            console.error('Engagement fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEngagement();
        const interval = setInterval(fetchEngagement, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, [workshopId]);

    const getEngagementColor = (score: number): string => {
        if (score >= 70) return theme === 'light' ? 'text-green-600' : 'text-green-400';
        if (score >= 40) return theme === 'light' ? 'text-yellow-600' : 'text-yellow-400';
        return theme === 'light' ? 'text-red-600' : 'text-red-400';
    };

    const getEngagementBgColor = (score: number): string => {
        if (score >= 70) return theme === 'light' ? 'bg-green-100' : 'bg-green-900/30';
        if (score >= 40) return theme === 'light' ? 'bg-yellow-100' : 'bg-yellow-900/30';
        return theme === 'light' ? 'bg-red-100' : 'bg-red-900/30';
    };

    if (loading) {
        return (
            <div className={`flex items-center justify-center p-6 ${className}`}>
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={`p-4 text-center ${className}`}>
                <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                    {error}
                </p>
                <button 
                    onClick={fetchEngagement}
                    className="mt-2 text-sm text-brand-violet hover:underline"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!engagement) return null;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Group Metrics Summary */}
            <div className={`rounded-lg p-4 ${theme === 'light' ? 'bg-gray-50' : 'bg-surface-700'}`}>
                <div className="flex items-center justify-between mb-3">
                    <h4 className={`text-sm font-medium flex items-center gap-2 ${
                        theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                    }`}>
                        <Activity className="w-4 h-4" />
                        Group Engagement
                    </h4>
                    <button 
                        onClick={fetchEngagement}
                        className={`p-1 rounded hover:bg-white/10 ${
                            theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                        }`}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                        <div className={`text-2xl font-bold ${getEngagementColor(engagement.group_metrics.avg_engagement)}`}>
                            {Math.round(engagement.group_metrics.avg_engagement)}%
                        </div>
                        <div className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                            Avg Score
                        </div>
                    </div>
                    <div className="text-center">
                        <div className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                            {engagement.group_metrics.total_participants}
                        </div>
                        <div className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                            Participants
                        </div>
                    </div>
                    <div className="text-center">
                        <div className={`text-2xl font-bold ${
                            engagement.group_metrics.at_risk_count > 0
                                ? theme === 'light' ? 'text-red-600' : 'text-red-400'
                                : theme === 'light' ? 'text-green-600' : 'text-green-400'
                        }`}>
                            {engagement.group_metrics.at_risk_count}
                        </div>
                        <div className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                            At Risk
                        </div>
                    </div>
                </div>
            </div>

            {/* Participant List */}
            <div className="space-y-2">
                <h4 className={`text-xs font-medium uppercase tracking-wider ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                    Participants ({engagement.participants.length})
                </h4>
                
                <div className="space-y-1 max-h-64 overflow-y-auto">
                    {engagement.participants.map((participant) => (
                        <div
                            key={participant.id}
                            className={`flex items-center justify-between p-2 rounded-lg ${
                                participant.alerts.length > 0
                                    ? theme === 'light' ? 'bg-yellow-50' : 'bg-yellow-900/20'
                                    : theme === 'light' ? 'bg-white' : 'bg-surface-800'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    getEngagementBgColor(participant.engagement_score)
                                }`}>
                                    <Users className={`w-4 h-4 ${getEngagementColor(participant.engagement_score)}`} />
                                </div>
                                <div>
                                    <div className={`text-sm font-medium ${
                                        theme === 'light' ? 'text-gray-900' : 'text-white'
                                    }`}>
                                        {participant.name}
                                    </div>
                                    <div className={`text-xs ${
                                        theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                    }`}>
                                        {participant.vote_count} votes, {participant.submission_count} submissions
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {participant.alerts.length > 0 && (
                                    <AlertCircle className={`w-4 h-4 ${
                                        theme === 'light' ? 'text-yellow-600' : 'text-yellow-400'
                                    }`} />
                                )}
                                <span className={`text-sm font-bold ${getEngagementColor(participant.engagement_score)}`}>
                                    {Math.round(participant.engagement_score)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
