import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface CopilotToggleProps {
    isOpen: boolean;
    onToggle: () => void;
    hasAlerts?: boolean;
    alertCount?: number;
}

export function CopilotToggle({ isOpen, onToggle, hasAlerts = false, alertCount = 0 }: CopilotToggleProps) {
    const { theme } = useTheme();

    return (
        <motion.button
            onClick={onToggle}
            className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-2 py-3 px-2 rounded-l-lg shadow-lg transition-colors ${
                isOpen
                    ? theme === 'light'
                        ? 'bg-white border border-r-0 border-gray-200'
                        : 'bg-surface-800 border border-r-0 border-white/10'
                    : 'bg-gradient-to-r from-brand-violet to-brand-magenta text-white'
            }`}
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.95 }}
        >
            {!isOpen && (
                <>
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm font-medium">AI</span>
                    {hasAlerts && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
                            {alertCount > 9 ? '9+' : alertCount}
                        </span>
                    )}
                </>
            )}
            {isOpen ? (
                <ChevronRight className={`w-4 h-4 ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`} />
            ) : (
                <ChevronLeft className="w-4 h-4" />
            )}
        </motion.button>
    );
}
