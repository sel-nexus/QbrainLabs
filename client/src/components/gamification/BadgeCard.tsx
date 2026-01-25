import type { BadgeResponse } from '../../lib/api/gamification';
import { useTheme } from '../../context/ThemeContext';

interface BadgeCardProps {
    badge: BadgeResponse;
    earned?: boolean;
    earnedAt?: string;
    className?: string;
}

const rarityColors: Record<string, string> = {
    common: 'bg-gray-500/20 border-gray-500/30',
    uncommon: 'bg-green-500/20 border-green-500/30',
    rare: 'bg-blue-500/20 border-blue-500/30',
    epic: 'bg-purple-500/20 border-purple-500/30',
    legendary: 'bg-yellow-500/20 border-yellow-500/30'
};

const rarityGlow: Record<string, string> = {
    common: '',
    uncommon: 'shadow-green-500/20',
    rare: 'shadow-blue-500/20',
    epic: 'shadow-purple-500/20 shadow-lg',
    legendary: 'shadow-yellow-500/30 shadow-xl'
};

export function BadgeCard({ badge, earned = false, earnedAt, className = '' }: BadgeCardProps) {
    const { theme } = useTheme();
    const rarity = badge.rarity?.toLowerCase() || 'common';
    const bgColor = rarityColors[rarity] || rarityColors.common;
    const glow = rarityGlow[rarity] || '';

    return (
        <div
            className={`relative p-4 rounded-xl border-2 ${bgColor} ${glow} ${earned ? 'opacity-100' : 'opacity-50'} transition-all ${className}`}
            title={badge.description || badge.name}
        >
            <div className="flex flex-col items-center gap-2">
                <div className={`text-4xl ${earned ? '' : 'grayscale'}`}>
                    {badge.icon || '🏅'}
                </div>
                <div className="text-center">
                    <h3 className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                        {badge.name}
                    </h3>
                    {badge.description && (
                        <p className={`text-xs mt-1 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                            {badge.description}
                        </p>
                    )}
                    {earned && earnedAt && (
                        <p className={`text-xs mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                            Earned {new Date(earnedAt).toLocaleDateString()}
                        </p>
                    )}
                </div>
                {earned && (
                    <div className="absolute top-1 right-1">
                        <span className="text-xs">✓</span>
                    </div>
                )}
            </div>
        </div>
    );
}
