import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { 
    Lightbulb, Users, TrendingUp, AlertTriangle, 
    MessageSquare, FileText, X, Check, ChevronRight 
} from 'lucide-react';

export interface SuggestionAction {
    label: string;
    action: string;
}

export interface Suggestion {
    id?: string;
    type: string;
    message: string;
    priority: string;
    actions: SuggestionAction[];
    context?: Record<string, unknown>;
}

interface SuggestionCardProps {
    suggestion: Suggestion;
    onAction: (action: string, suggestionId?: string) => void;
    onDismiss: (suggestionId?: string) => void;
}

export function SuggestionCard({ suggestion, onAction, onDismiss }: SuggestionCardProps) {
    const { theme } = useTheme();

    const typeIcons: Record<string, React.ReactNode> = {
        engagement: <Users className="w-5 h-5" />,
        content: <FileText className="w-5 h-5" />,
        voting: <TrendingUp className="w-5 h-5" />,
        facilitation: <Lightbulb className="w-5 h-5" />,
        anomaly: <AlertTriangle className="w-5 h-5" />,
        discussion: <MessageSquare className="w-5 h-5" />,
    };

    const priorityColors: Record<string, string> = {
        low: theme === 'light' ? 'border-gray-300 bg-gray-50' : 'border-gray-600 bg-gray-800/50',
        medium: theme === 'light' ? 'border-blue-300 bg-blue-50' : 'border-blue-500/50 bg-blue-900/20',
        high: theme === 'light' ? 'border-yellow-300 bg-yellow-50' : 'border-yellow-500/50 bg-yellow-900/20',
        urgent: theme === 'light' ? 'border-red-300 bg-red-50' : 'border-red-500/50 bg-red-900/20',
    };

    const priorityIconColors: Record<string, string> = {
        low: theme === 'light' ? 'text-gray-500' : 'text-gray-400',
        medium: theme === 'light' ? 'text-blue-600' : 'text-blue-400',
        high: theme === 'light' ? 'text-yellow-600' : 'text-yellow-400',
        urgent: theme === 'light' ? 'text-red-600' : 'text-red-400',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`rounded-lg border-l-4 p-4 ${priorityColors[suggestion.priority] || priorityColors.medium}`}
        >
            <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${priorityIconColors[suggestion.priority]}`}>
                    {typeIcons[suggestion.type] || <Lightbulb className="w-5 h-5" />}
                </div>
                
                <div className="flex-1 min-w-0">
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-200'}`}>
                        {suggestion.message}
                    </p>
                    
                    {suggestion.context && Object.keys(suggestion.context).length > 0 && (
                        <div className={`mt-2 text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                            {suggestion.context.submission_rate !== undefined && (
                                <span>Submission rate: {suggestion.context.submission_rate as number}%</span>
                            )}
                            {suggestion.context.std_dev !== undefined && (
                                <span>Variance: σ = {suggestion.context.std_dev as number}</span>
                            )}
                        </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                        {suggestion.actions.map((action, idx) => (
                            action.action === 'dismiss' ? (
                                <button
                                    key={idx}
                                    onClick={() => onDismiss(suggestion.id)}
                                    className={`px-3 py-1.5 text-xs rounded-full flex items-center gap-1 transition-colors ${
                                        theme === 'light'
                                            ? 'text-gray-500 hover:bg-gray-200'
                                            : 'text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    <X className="w-3 h-3" />
                                    Dismiss
                                </button>
                            ) : (
                                <button
                                    key={idx}
                                    onClick={() => onAction(action.action, suggestion.id)}
                                    className={`px-3 py-1.5 text-xs rounded-full flex items-center gap-1 transition-colors ${
                                        idx === 0
                                            ? 'bg-gradient-to-r from-brand-violet to-brand-magenta text-white'
                                            : theme === 'light'
                                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                : 'bg-white/10 text-gray-200 hover:bg-white/20'
                                    }`}
                                >
                                    {idx === 0 && <Check className="w-3 h-3" />}
                                    {action.label}
                                    {idx === 0 && <ChevronRight className="w-3 h-3" />}
                                </button>
                            )
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
