import { useEffect, useState } from 'react';
import {
    Brain,
    TrendingUp,
    Clock,
    Lightbulb,
    ChevronDown,
    ChevronUp,
    Loader2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface WorkshopInsight {
    workshop_id: string;
    workshop_title: string;
    total_use_cases: number;
    categories_distribution: Record<string, number>;
    complexity_distribution: Record<string, number>;
    recommended_templates: Array<{
        id: string;
        title: string;
        description: string;
        category: string;
        complexity: string;
        typical_roi: string;
        implementation_time: string;
        technologies: string[];
        kpis: string[];
    }>;
    ai_summary: string | null;
}

interface WorkshopInsightsProps {
    workshopId: string;
}

export function WorkshopInsights({ workshopId }: WorkshopInsightsProps) {
    const { theme } = useTheme();
    const [insights, setInsights] = useState<WorkshopInsight | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchInsights();
    }, [workshopId]);

    const fetchInsights = async () => {
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            if (!authToken) {
                setError('Authentication required');
                setLoading(false);
                return;
            }

            const response = await fetch(
                `http://localhost:8000/api/knowledge-base/workshop/${workshopId}/insights`,
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );

            if (!response.ok) {
                if (response.status === 403) {
                    setError('Access denied');
                } else {
                    throw new Error('Failed to fetch insights');
                }
                return;
            }

            const data = await response.json();
            setInsights(data);
        } catch (err) {
            console.error('Error fetching insights:', err);
            setError('Failed to load AI insights');
        } finally {
            setLoading(false);
        }
    };

    const getComplexityColor = (complexity: string) => {
        switch (complexity.toLowerCase()) {
            case 'low': return 'theme-badge-success';
            case 'medium': return 'theme-badge-warning';
            case 'high': return 'theme-badge-danger';
            default: return 'theme-badge-neutral';
        }
    };

    if (loading) {
        return (
            <div className="theme-bg-secondary rounded-xl p-4 border theme-border">
                <div className="flex items-center gap-2 contrast-muted">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading AI insights...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return null; // Don't show anything if there's an error
    }

    if (!insights || insights.total_use_cases === 0) {
        return (
            <div className="theme-bg-secondary rounded-xl p-4 border theme-border">
                <div className="flex items-center gap-2 contrast-muted">
                    <Brain className="w-4 h-4" />
                    <span className="text-sm">AI insights will appear after use cases are submitted</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-xl border overflow-hidden ${theme === 'light'
                ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
                : 'bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/20'
            }`}>
            {/* Header - Always visible */}
            <button
                onClick={() => setExpanded(!expanded)}
                className={`w-full p-4 flex items-center justify-between transition ${theme === 'light' ? 'hover:bg-purple-100/50' : 'hover:bg-white/5'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${theme === 'light' ? 'bg-purple-100' : 'bg-purple-500/20'
                        }`}>
                        <Brain className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="text-left">
                        <h3 className="theme-text-primary font-semibold">AI Insights</h3>
                        <p className="text-sm contrast-muted">
                            {insights.total_use_cases} use cases analyzed
                        </p>
                    </div>
                </div>
                {expanded ? (
                    <ChevronUp className="w-5 h-5 theme-text-secondary" />
                ) : (
                    <ChevronDown className="w-5 h-5 theme-text-secondary" />
                )}
            </button>

            {/* Expanded Content */}
            {expanded && (
                <div className="px-4 pb-4 space-y-4">
                    {/* AI Summary */}
                    {insights.ai_summary && (
                        <div className={`rounded-lg p-4 ${theme === 'light' ? 'bg-white/70' : 'theme-bg-secondary'
                            }`}>
                            <div className="flex items-start gap-3">
                                <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5" />
                                <p className="theme-text-secondary text-sm">{insights.ai_summary}</p>
                            </div>
                        </div>
                    )}

                    {/* Category Distribution */}
                    <div className={`rounded-lg p-4 ${theme === 'light' ? 'bg-white/70' : 'theme-bg-secondary'
                        }`}>
                        <h4 className="text-sm font-medium contrast-muted mb-3">Category Distribution</h4>
                        <div className="space-y-2">
                            {Object.entries(insights.categories_distribution).map(([category, count]) => (
                                <div key={category} className="flex items-center justify-between">
                                    <span className="text-sm theme-text-primary">{category}</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-24 h-2 rounded-full overflow-hidden ${theme === 'light' ? 'bg-gray-200' : 'theme-bg-tertiary'
                                            }`}>
                                            <div
                                                className="h-full bg-purple-500 rounded-full"
                                                style={{ width: `${(count / insights.total_use_cases) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs contrast-muted w-8">{count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Complexity Distribution */}
                    <div className={`rounded-lg p-4 ${theme === 'light' ? 'bg-white/70' : 'theme-bg-secondary'
                        }`}>
                        <h4 className="text-sm font-medium contrast-muted mb-3">Estimated Complexity</h4>
                        <div className="flex gap-4">
                            {Object.entries(insights.complexity_distribution).map(([level, count]) => (
                                <div key={level} className="flex-1 text-center">
                                    <div className={`text-2xl font-bold ${getComplexityColor(level).split(' ')[0]}`}>
                                        {count}
                                    </div>
                                    <div className="text-xs contrast-muted">{level}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommended Templates */}
                    {insights.recommended_templates.length > 0 && (
                        <div className={`rounded-lg p-4 ${theme === 'light' ? 'bg-white/70' : 'theme-bg-secondary'
                            }`}>
                            <h4 className="text-sm font-medium contrast-muted mb-3">Recommended Templates</h4>
                            <div className="space-y-3">
                                {insights.recommended_templates.slice(0, 3).map((template) => (
                                    <div
                                        key={template.id}
                                        className={`rounded-lg p-3 border ${theme === 'light'
                                                ? 'bg-gray-50 border-gray-200'
                                                : 'theme-bg-tertiary theme-border'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h5 className="theme-text-primary font-medium text-sm">{template.title}</h5>
                                            <span className={`text-xs px-2 py-0.5 rounded ${getComplexityColor(template.complexity)}`}>
                                                {template.complexity}
                                            </span>
                                        </div>
                                        <p className="text-xs contrast-muted mb-2 line-clamp-2">{template.description}</p>
                                        <div className="flex items-center gap-4 text-xs">
                                            <div className="flex items-center gap-1 text-green-500">
                                                <TrendingUp className="w-3 h-3" />
                                                <span>{template.typical_roi}</span>
                                            </div>
                                            <div className="flex items-center gap-1 contrast-muted">
                                                <Clock className="w-3 h-3" />
                                                <span>{template.implementation_time}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
