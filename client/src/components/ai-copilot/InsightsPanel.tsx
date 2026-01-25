import { useTheme } from '../../context/ThemeContext';
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3, Clock } from 'lucide-react';

interface Insight {
    type: 'positive' | 'negative' | 'neutral' | 'warning';
    title: string;
    value?: string;
    description: string;
}

interface InsightsPanelProps {
    insights: Insight[];
    className?: string;
}

export function InsightsPanel({ insights, className = '' }: InsightsPanelProps) {
    const { theme } = useTheme();

    if (insights.length === 0) {
        return (
            <div className={`p-4 text-center ${className}`}>
                <BarChart3 className={`w-8 h-8 mx-auto mb-2 ${
                    theme === 'light' ? 'text-gray-300' : 'text-gray-600'
                }`} />
                <p className={`text-sm ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                    Insights will appear as the workshop progresses
                </p>
            </div>
        );
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'positive':
                return <TrendingUp className="w-4 h-4 text-green-500" />;
            case 'negative':
                return <TrendingDown className="w-4 h-4 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            default:
                return <Clock className="w-4 h-4 text-blue-500" />;
        }
    };

    const getBackgroundColor = (type: string) => {
        switch (type) {
            case 'positive':
                return theme === 'light' ? 'bg-green-50 border-green-200' : 'bg-green-900/20 border-green-500/30';
            case 'negative':
                return theme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-900/20 border-red-500/30';
            case 'warning':
                return theme === 'light' ? 'bg-yellow-50 border-yellow-200' : 'bg-yellow-900/20 border-yellow-500/30';
            default:
                return theme === 'light' ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/20 border-blue-500/30';
        }
    };

    return (
        <div className={`space-y-3 ${className}`}>
            <h4 className={`text-xs font-medium uppercase tracking-wider ${
                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
            }`}>
                Behavioral Insights
            </h4>
            
            <div className="space-y-2">
                {insights.map((insight, index) => (
                    <div
                        key={index}
                        className={`p-3 rounded-lg border ${getBackgroundColor(insight.type)}`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                                {getIcon(insight.type)}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-medium ${
                                        theme === 'light' ? 'text-gray-900' : 'text-white'
                                    }`}>
                                        {insight.title}
                                    </span>
                                    {insight.value && (
                                        <span className={`text-sm font-bold ${
                                            insight.type === 'positive' ? 'text-green-600' :
                                            insight.type === 'negative' ? 'text-red-600' :
                                            insight.type === 'warning' ? 'text-yellow-600' :
                                            'text-blue-600'
                                        }`}>
                                            {insight.value}
                                        </span>
                                    )}
                                </div>
                                <p className={`text-xs mt-1 ${
                                    theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                                }`}>
                                    {insight.description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
