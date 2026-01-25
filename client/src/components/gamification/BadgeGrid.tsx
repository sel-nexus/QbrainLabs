import { getAllBadges, getEarnedBadges } from '../../lib/api/gamification';
import type { BadgeResponse, EarnedBadgeResponse } from '../../lib/api/gamification';
import { useEffect, useState } from 'react';
import { BadgeCard } from './BadgeCard';
import { useTheme } from '../../context/ThemeContext';
import { Loader2 } from 'lucide-react';

interface BadgeGridProps {
    participantId: string;
    workshopId?: string;
}

export function BadgeGrid({ participantId, workshopId }: BadgeGridProps) {
    const { theme } = useTheme();
    const [allBadges, setAllBadges] = useState<BadgeResponse[]>([]);
    const [earnedBadges, setEarnedBadges] = useState<EarnedBadgeResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBadges = async () => {
            try {
                const [all, earned] = await Promise.all([
                    getAllBadges(),
                    getEarnedBadges(participantId)
                ]);
                setAllBadges(all);
                setEarnedBadges(earned);
            } catch (error) {
                console.error('Failed to fetch badges:', error);
            } finally {
                setLoading(false);
            }
        };

        if (participantId) {
            fetchBadges();
        }
    }, [participantId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    const earnedBadgeIds = new Set(earnedBadges.map(eb => eb.badge.id));

    return (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${theme === 'light' ? 'bg-white' : 'bg-surface-800'} p-4 rounded-xl`}>
            {allBadges.map((badge) => {
                const earned = earnedBadgeIds.has(badge.id);
                const earnedBadge = earnedBadges.find(eb => eb.badge.id === badge.id);
                return (
                    <BadgeCard
                        key={badge.id}
                        badge={badge}
                        earned={earned}
                        earnedAt={earnedBadge?.earned_at}
                    />
                );
            })}
        </div>
    );
}
