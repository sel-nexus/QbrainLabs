import { useEffect } from 'react';
import { socket } from '../../lib/socket';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface AchievementToastProps {
    participantId: string;
}

const BATCH_MS = 800;

/**
 * All reward feedback in one toast: points and badges that arrive together
 * (the server sends them back-to-back) are merged instead of stacking up.
 */
export function AchievementToast({ participantId }: AchievementToastProps) {
    const { i18n } = useTranslation();

    useEffect(() => {
        let points = 0;
        let badges: string[] = [];
        let timer: ReturnType<typeof setTimeout> | undefined;

        const flush = () => {
            const parts = [
                points > 0 ? i18n.t('gamification.pointsEarned', { count: points }) : '',
                badges.length ? i18n.t('gamification.badgeUnlocked', { names: badges.join(', ') }) : '',
            ].filter(Boolean);
            if (parts.length) toast.success(parts.join(' · '), { id: 'reward', icon: badges.length ? '🏅' : '🪙', duration: 3000 });
            points = 0;
            badges = [];
        };
        const queue = () => {
            clearTimeout(timer);
            timer = setTimeout(flush, BATCH_MS);
        };

        const handleBadgeUnlocked = (data: { participant_id: string; badge_name: string }) => {
            if (data.participant_id !== participantId) return;
            badges.push(data.badge_name);
            queue();
        };
        const handlePointsEarned = (data: { participant_id: string; points: number }) => {
            if (data.participant_id !== participantId || data.points <= 0) return;
            points += data.points;
            queue();
        };

        socket.on('gamification:badge_unlocked', handleBadgeUnlocked);
        socket.on('gamification:points_earned', handlePointsEarned);
        return () => {
            clearTimeout(timer);
            socket.off('gamification:badge_unlocked', handleBadgeUnlocked);
            socket.off('gamification:points_earned', handlePointsEarned);
        };
    }, [participantId, i18n]);

    return null;
}
