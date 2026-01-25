import { type ReactNode } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { ChevronRight } from 'lucide-react';

interface ActionTileProps {
    icon: ReactNode;
    title: string;
    description: string;
    badge?: string | number;
    badgeVariant?: 'default' | 'success' | 'warning' | 'info';
    status?: string;
    disabled?: boolean;
    disabledReason?: string;
    onClick?: () => void;
}

export function ActionTile({
    icon,
    title,
    description,
    badge,
    badgeVariant = 'default',
    status,
    disabled = false,
    disabledReason,
    onClick
}: ActionTileProps) {
    const { theme } = useTheme();

    const badgeColors = {
        default: theme === 'light' ? 'bg-gray-100 text-gray-600' : 'bg-surface-700 text-gray-300',
        success: 'bg-semantic-success/20 text-semantic-success',
        warning: 'bg-yellow-500/20 text-yellow-500',
        info: 'bg-brand-violet/20 text-brand-violet'
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={disabled ? disabledReason : undefined}
            className={`
                relative w-full p-6 rounded-2xl border text-left transition-all duration-200
                ${theme === 'light'
                    ? 'bg-white border-gray-200 shadow-sm'
                    : 'bg-surface-800 border-white/10'
                }
                ${disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:scale-[1.02] hover:shadow-lg hover:border-brand-violet/50 cursor-pointer active:scale-[0.98]'
                }
            `}
        >
            {/* Icon */}
            <div className={`
                w-14 h-14 rounded-xl flex items-center justify-center mb-4
                ${disabled
                    ? theme === 'light' ? 'bg-gray-100' : 'bg-surface-700'
                    : 'bg-gradient-to-br from-brand-violet/20 to-brand-magenta/20'
                }
            `}>
                <div className={disabled ? 'text-gray-400' : 'text-brand-violet'}>
                    {icon}
                </div>
            </div>

            {/* Title */}
            <h3 className={`text-lg font-bold mb-1 ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
                {title}
            </h3>

            {/* Description */}
            <p className={`text-sm mb-4 ${
                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
            }`}>
                {description}
            </p>

            {/* Footer with badge/status */}
            <div className="flex items-center justify-between">
                {badge !== undefined && (
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${badgeColors[badgeVariant]}`}>
                        {badge}
                    </span>
                )}
                {status && !badge && (
                    <span className={`text-xs ${theme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {status}
                    </span>
                )}
                {!disabled && (
                    <ChevronRight className={`w-5 h-5 ${
                        theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                )}
            </div>

            {/* Disabled overlay tooltip */}
            {disabled && disabledReason && (
                <div className={`absolute inset-x-0 bottom-0 px-4 py-2 text-xs text-center rounded-b-2xl ${
                    theme === 'light' ? 'bg-gray-50 text-gray-500' : 'bg-surface-900/50 text-gray-500'
                }`}>
                    {disabledReason}
                </div>
            )}
        </button>
    );
}
