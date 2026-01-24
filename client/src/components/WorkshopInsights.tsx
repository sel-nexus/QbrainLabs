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
    const [insights, setInsights] = useState<WorkshopInsight | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchInsights();
    }, [workshopId]);

    const fetchInsights = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
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
            case 'low': return 'text-green-400 bg-green-500/10';
            case 'medium': return 'text-yellow-400 bg-yellow-500/10';
            case 'high': return 'text-red-400 bg-red-500/10';
            default: return 'text-gray-400 bg-gray-500/10';
        }
    };

    if (loading) {
        return (
            <div className="bg-surface-800 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-gray-400">
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
            <div className="bg-surface-800 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-gray-400">
                    <Brain className="w-4 h-4" />
                    <span className="text-sm">AI insights will appear after use cases are submitted</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-xl border border-purple-500/20 overflow-hidden">
            {/* Header - Always visible */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-white font-semibold">AI Insights</h3>
                        <p className="text-sm text-gray-400">
                            {insights.total_use_cases} use cases analyzed
                        </p>
                    </div>
                </div>
                {expanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
            </button>

            {/* Expanded Content */}
            {expanded && (
                <div className="px-4 pb-4 space-y-4">
                    {/* AI Summary */}
                    {insights.ai_summary && (
                        <div className="bg-surface-800/50 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <Lightbulb className="w-5 h-5 text-amber-400 mt-0.5" />
                                <p className="text-gray-300 text-sm">{insights.ai_summary}</p>
                            </div>
                        </div>
                    )}

                    {/* Category Distribution */}
                    <div className="bg-surface-800/50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-400 mb-3">Category Distribution</h4>
                        <div className="space-y-2">
                            {Object.entries(insights.categories_distribution).map(([category, count]) => (
                                <div key={category} className="flex items-center justify-between">
                                    <span className="text-sm text-white">{category}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-surface-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 rounded-full"
                                                style={{ width: `${(count / insights.total_use_cases) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-400 w-8">{count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Complexity Distribution */}
                    <div className="bg-surface-800/50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-400 mb-3">Estimated Complexity</h4>
                        <div className="flex gap-4">
                            {Object.entries(insights.complexity_distribution).map(([level, count]) => (
                                <div key={level} className="flex-1 text-center">
                                    <div className={`text-2xl font-bold ${getComplexityColor(level).split(' ')[0]}`}>
                                        {count}
                                    </div>
                                    <div className="text-xs text-gray-400">{level}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommended Templates */}
                    {insights.recommended_templates.length > 0 && (
                        <div className="bg-surface-800/50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-400 mb-3">Recommended Templates</h4>
                            <div className="space-y-3">
                                {insights.recommended_templates.slice(0, 3).map((template) => (
                                    <div
                                        key={template.id}
                                        className="bg-surface-700/50 rounded-lg p-3 border border-white/5"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h5 className="text-white font-medium text-sm">{template.title}</h5>
                                            <span className={`text-xs px-2 py-0.5 rounded ${getComplexityColor(template.complexity)}`}>
                                                {template.complexity}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mb-2 line-clamp-2">{template.description}</p>
                                        <div className="flex items-center gap-4 text-xs">
                                            <div className="flex items-center gap-1 text-green-400">
                                                <TrendingUp className="w-3 h-3" />
                                                <span>{template.typical_roi}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-400">
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
