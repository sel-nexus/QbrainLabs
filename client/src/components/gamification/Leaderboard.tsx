import { useState } from 'react';
import { getWorkshopLeaderboard, type LeaderboardEntry } from '../../lib/api/gamification';
import { useTheme } from '../../context/ThemeContext';
import { Trophy, Medal, Award, Loader2 } from 'lucide-react';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';

interface LeaderboardProps {
    workshopPin: string;
    currentParticipantId?: string;
    className?: string;
}

export function Leaderboard({ workshopPin, currentParticipantId, className = '' }: LeaderboardProps) {
    const { theme } = useTheme();
    const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useLiveRefresh(async () => {
        try {
            const data = await getWorkshopLeaderboard(workshopPin);
            setRankings(data.rankings);
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setLoading(false);
        }
    }, ['gamification:points_earned']);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
        if (rank === 3) return <Award className="w-5 h-5 text-orange-500" />;
        return <span className="text-sm font-bold text-gray-400">#{rank}</span>;
    };

    if (loading) {
        return (
            <div className={`flex items-center justify-center p-8 ${className}`}>
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (rankings.length === 0) {
        return (
            <div className={`p-8 text-center ${theme === 'light' ? 'bg-white' : 'bg-surface-800'} rounded-xl ${className}`}>
                <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                    No rankings yet. Be the first to earn points!
                </p>
            </div>
        );
    }

    return (
        <div className={`${theme === 'light' ? 'bg-white' : 'bg-surface-800'} rounded-xl overflow-hidden ${className}`}>
            <div className={`p-4 border-b ${theme === 'light' ? 'border-gray-200' : 'border-white/10'}`}>
                <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    Leaderboard
                </h3>
            </div>
            <div className="divide-y divide-white/10">
                {rankings.slice(0, 10).map((entry) => {
                    const isCurrentUser = currentParticipantId && entry.participant_id === currentParticipantId;
                    return (
                        <div
                            key={entry.participant_id}
                            className={`p-4 flex items-center justify-between transition-colors ${
                                isCurrentUser
                                    ? theme === 'light'
                                        ? 'bg-yellow-50 border-l-4 border-yellow-500'
                                        : 'bg-yellow-500/10 border-l-4 border-yellow-500'
                                    : theme === 'light'
                                        ? 'hover:bg-gray-50'
                                        : 'hover:bg-surface-700'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8">
                                    {getRankIcon(entry.rank)}
                                </div>
                                <div>
                                    <div className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                        {entry.display_name}
                                        {isCurrentUser && (
                                            <span className="ml-2 text-xs text-yellow-500">(You)</span>
                                        )}
                                    </div>
                                    {entry.badges_count > 0 && (
                                        <div className="text-xs text-gray-400">
                                            {entry.badges_count} badge{entry.badges_count !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={`text-lg font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                {entry.points.toLocaleString()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
