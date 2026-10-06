import { useState } from 'react';
import { Coins } from 'lucide-react';
import { getParticipantPoints } from '../../lib/api/gamification';
import type { PointsResponse } from '../../lib/api/gamification';
import { useTheme } from '../../context/ThemeContext';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';

interface PointsDisplayProps {
    participantId: string;
    className?: string;
}

export function PointsDisplay({ participantId, className = '' }: PointsDisplayProps) {
    const { theme } = useTheme();
    const [points, setPoints] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useLiveRefresh(async () => {
        try {
            const data: PointsResponse = await getParticipantPoints(participantId);
            setPoints(data.total_points);
        } catch (error) {
            console.error('Failed to fetch points:', error);
        } finally {
            setLoading(false);
        }
    }, ['gamification:points_earned'], !!participantId);

    if (loading) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <Coins className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-400">...</span>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                {points.toLocaleString()}
            </span>
        </div>
    );
}
