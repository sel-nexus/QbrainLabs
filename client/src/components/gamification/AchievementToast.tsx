import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../../lib/socket';
import { toast } from 'sonner';
import { Trophy, Sparkles } from 'lucide-react';

interface AchievementToastProps {
    participantId: string;
}

export function AchievementToast({ participantId }: AchievementToastProps) {
    const [showAnimation, setShowAnimation] = useState(false);
    const [badgeName, setBadgeName] = useState<string>('');

    useEffect(() => {
        const handleBadgeUnlocked = (data: { participant_id: string; badge_name: string }) => {
            if (data.participant_id === participantId) {
                setBadgeName(data.badge_name);
                setShowAnimation(true);
                toast.success(`Badge Unlocked: ${data.badge_name}!`, {
                    duration: 4000,
                    icon: '🏅',
                });
                
                setTimeout(() => {
                    setShowAnimation(false);
                }, 3000);
            }
        };

        const handlePointsEarned = (data: { participant_id: string; points: number; action: string }) => {
            if (data.participant_id === participantId && data.points > 0) {
                toast.success(`+${data.points} points earned!`, {
                    duration: 2000,
                    icon: '🪙',
                });
            }
        };

        socket.on('gamification:badge_unlocked', handleBadgeUnlocked);
        socket.on('gamification:points_earned', handlePointsEarned);

        return () => {
            socket.off('gamification:badge_unlocked', handleBadgeUnlocked);
            socket.off('gamification:points_earned', handlePointsEarned);
        };
    }, [participantId]);

    return (
        <AnimatePresence>
            {showAnimation && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: -50 }}
                    transition={{ duration: 0.5 }}
                    className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
                >
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                        <div>
                            <div className="font-bold text-lg">Badge Unlocked!</div>
                            <div className="text-sm">{badgeName}</div>
                        </div>
                        <Trophy className="w-8 h-8" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
