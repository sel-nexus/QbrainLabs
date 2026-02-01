import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    BarChart3,
    Users,
    Clock,
    RefreshCw,
    Download,
    ChevronDown,
    ChevronUp,
    Star,
    MessageSquare
} from 'lucide-react';
import { Button } from '../ui/Button';
import { API_BASE_URL } from '../../lib/config';

interface QuestionResult {
    question_id: string;
    text: string;
    type: string;
    response_count: number;
    distribution?: Array<{ option: string; count: number; percentage: number }>;
    average?: number;
    median?: number;
    responses?: string[];
    word_frequency?: Array<{ word: string; count: number }>;
}

interface SurveyResultsData {
    survey_id: string;
    total_responses: number;
    questions: QuestionResult[];
    last_updated: string;
}

interface SurveyProgress {
    total_participants: number;
    started_count: number;
    completed_count: number;
    completion_rate: number;
    average_time_seconds: number | null;
}

interface SurveyResultsProps {
    surveyId: string;
    onClose?: () => void;
}

export function SurveyResults({ surveyId, onClose }: SurveyResultsProps) {
    const [results, setResults] = useState<SurveyResultsData | null>(null);
    const [progress, setProgress] = useState<SurveyProgress | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
    const [autoRefresh, setAutoRefresh] = useState(false);

    useEffect(() => {
        fetchData();
    }, [surveyId]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (autoRefresh) {
            interval = setInterval(fetchData, 5000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh, surveyId]);

    const fetchData = async () => {
        try {
            const authToken = localStorage.getItem('hm_auth_token');

            const [resultsRes, progressRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/surveys/${surveyId}/results`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }),
                fetch(`${API_BASE_URL}/api/surveys/${surveyId}/progress`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                })
            ]);

            if (resultsRes.ok) {
                const data = await resultsRes.json();
                setResults(data);
                // Expand all questions by default
                if (expandedQuestions.size === 0) {
                    setExpandedQuestions(new Set(data.questions.map((q: QuestionResult) => q.question_id)));
                }
            }
            if (progressRes.ok) {
                setProgress(await progressRes.json());
            }
        } catch (error) {
            toast.error('Failed to load results');
        } finally {
            setLoading(false);
        }
    };

    const toggleQuestion = (questionId: string) => {
        const newExpanded = new Set(expandedQuestions);
        if (newExpanded.has(questionId)) {
            newExpanded.delete(questionId);
        } else {
            newExpanded.add(questionId);
        }
        setExpandedQuestions(newExpanded);
    };

    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    const exportResults = () => {
        if (!results) return;

        const csvRows = ['Question,Type,Response Count,Results'];
        results.questions.forEach(q => {
            let resultStr = '';
            if (q.distribution) {
                resultStr = q.distribution.map(d => `${d.option}: ${d.count} (${d.percentage}%)`).join('; ');
            } else if (q.average !== undefined) {
                resultStr = `Average: ${q.average}`;
            } else if (q.responses) {
                resultStr = `${q.responses.length} text responses`;
            }
            csvRows.push(`"${q.text}",${q.type},${q.response_count},"${resultStr}"`);
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survey_results_${surveyId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Results exported');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="text-center py-12 text-gray-400">
                No results available
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Survey Results</h2>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-400">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded border-gray-600 bg-surface-700 text-purple-500"
                        />
                        Auto-refresh
                    </label>
                    <Button variant="ghost" onClick={fetchData}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="secondary" onClick={exportResults}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    {onClose && (
                        <Button variant="ghost" onClick={onClose}>
                            Close
                        </Button>
                    )}
                </div>
            </div>

            {/* Progress Overview */}
            {progress && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-surface-800 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <Users className="w-4 h-4" />
                            <span className="text-sm">Total Participants</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{progress.total_participants}</div>
                    </div>
                    <div className="bg-surface-800 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <BarChart3 className="w-4 h-4" />
                            <span className="text-sm">Completed</span>
                        </div>
                        <div className="text-2xl font-bold text-green-400">{progress.completed_count}</div>
                    </div>
                    <div className="bg-surface-800 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <BarChart3 className="w-4 h-4" />
                            <span className="text-sm">Completion Rate</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-400">{progress.completion_rate}%</div>
                    </div>
                    <div className="bg-surface-800 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">Avg. Time</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {progress.average_time_seconds ? formatTime(progress.average_time_seconds) : '--'}
                        </div>
                    </div>
                </div>
            )}

            {/* Question Results */}
            <div className="space-y-4">
                {results.questions.map((question, index) => (
                    <div
                        key={question.question_id}
                        className="bg-surface-800 rounded-xl border border-white/10 overflow-hidden"
                    >
                        {/* Question Header */}
                        <button
                            onClick={() => toggleQuestion(question.question_id)}
                            className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition text-left"
                        >
                            <span className="text-sm font-mono text-purple-400">Q{index + 1}</span>
                            <span className="flex-1 text-white">{question.text}</span>
                            <span className="text-sm text-gray-400">{question.response_count} responses</span>
                            {expandedQuestions.has(question.question_id) ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                        </button>

                        {/* Question Results */}
                        {expandedQuestions.has(question.question_id) && (
                            <div className="p-4 border-t border-white/10">
                                {/* Distribution Chart for choice questions */}
                                {question.distribution && question.distribution.length > 0 && (
                                    <div className="space-y-3">
                                        {question.distribution.map((item, idx) => (
                                            <div key={idx}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm text-white">{item.option}</span>
                                                    <span className="text-sm text-gray-400">
                                                        {item.count} ({item.percentage}%)
                                                    </span>
                                                </div>
                                                <div className="h-6 bg-surface-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${item.percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Rating display */}
                                {question.average !== undefined && (
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <div className="flex items-center gap-1 mb-1">
                                                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                                                <span className="text-3xl font-bold text-white">{question.average}</span>
                                            </div>
                                            <span className="text-sm text-gray-400">Average</span>
                                        </div>
                                        {question.median !== undefined && (
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-white mb-1">{question.median}</div>
                                                <span className="text-sm text-gray-400">Median</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Text responses */}
                                {question.responses && question.responses.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                                            <MessageSquare className="w-4 h-4" />
                                            <span className="text-sm">Text Responses ({question.responses.length})</span>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto space-y-2">
                                            {question.responses.map((response, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-3 bg-surface-700 rounded-lg text-sm text-gray-300"
                                                >
                                                    "{response}"
                                                </div>
                                            ))}
                                        </div>

                                        {/* Word Cloud Preview */}
                                        {question.word_frequency && question.word_frequency.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-white/10">
                                                <h4 className="text-sm text-gray-400 mb-3">Common Words</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {question.word_frequency.slice(0, 20).map((word, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-sm"
                                                            style={{
                                                                fontSize: `${Math.max(12, Math.min(24, 12 + word.count * 2))}px`
                                                            }}
                                                        >
                                                            {word.word}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {question.response_count === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        No responses yet
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Last Updated */}
            <div className="text-center text-sm text-gray-500">
                Last updated: {new Date(results.last_updated).toLocaleTimeString()}
            </div>
        </div>
    );
}
