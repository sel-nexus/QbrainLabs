import { useState, useEffect, useRef, useCallback } from 'react';
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
    MessageSquare,
    Radio,
    WifiOff,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { API_BASE_URL } from '../../lib/config';
import { socket } from '../../lib/socket';

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
    participants?: Array<{
        participant_id: string;
        participant_name: string;
        status: string;
        current_question?: number | null;
        started_at?: string | null;
        completed_at?: string | null;
    }>;
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
    const [isLive, setIsLive] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [showParticipants, setShowParticipants] = useState(false);
    const isMounted = useRef(true);

    const fetchData = useCallback(async (silent = false) => {
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const headers = { 'Authorization': `Bearer ${authToken}` };

            const [resultsRes, progressRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/surveys/${surveyId}/results`, { headers }),
                fetch(`${API_BASE_URL}/api/surveys/${surveyId}/progress`, { headers }),
            ]);

            if (!isMounted.current) return;

            if (resultsRes.ok) {
                const data = await resultsRes.json();
                setResults(data);
                setExpandedQuestions((prev) =>
                    prev.size === 0
                        ? new Set(data.questions.map((q: QuestionResult) => q.question_id))
                        : prev
                );
            }
            if (progressRes.ok) {
                setProgress(await progressRes.json());
            }
            setLastRefreshed(new Date());
        } catch {
            if (!silent) toast.error('Failed to load results');
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, [surveyId]);

    // Initial load
    useEffect(() => {
        isMounted.current = true;
        fetchData();
        return () => { isMounted.current = false; };
    }, [fetchData]);

    // Socket.io real-time subscription
    useEffect(() => {
        // Join the survey room
        socket.emit('join_survey', { survey_id: surveyId });
        setIsLive(socket.connected);

        const onConnect = () => setIsLive(true);
        const onDisconnect = () => setIsLive(false);

        const onResponseSubmitted = () => {
            fetchData(true);
        };
        const onParticipantStarted = () => {
            // Refresh progress only
            const authToken = localStorage.getItem('hm_auth_token');
            fetch(`${API_BASE_URL}/api/surveys/${surveyId}/progress`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            })
                .then((r) => r.ok ? r.json() : null)
                .then((data) => { if (data && isMounted.current) setProgress(data); })
                .catch(() => {});
        };
        const onParticipantCompleted = () => {
            fetchData(true);
        };
        const onStatusChanged = (data: { new_status: string }) => {
            if (!isMounted.current) return;
            toast.info(`Survey status changed to ${data.new_status}`);
            fetchData(true);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('survey:response_submitted', onResponseSubmitted);
        socket.on('survey:participant_started', onParticipantStarted);
        socket.on('survey:participant_completed', onParticipantCompleted);
        socket.on('survey:status_changed', onStatusChanged);

        return () => {
            socket.emit('leave_survey', { survey_id: surveyId });
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('survey:response_submitted', onResponseSubmitted);
            socket.off('survey:participant_started', onParticipantStarted);
            socket.off('survey:participant_completed', onParticipantCompleted);
            socket.off('survey:status_changed', onStatusChanged);
        };
    }, [surveyId, fetchData]);

    const toggleQuestion = (questionId: string) => {
        setExpandedQuestions((prev) => {
            const next = new Set(prev);
            if (next.has(questionId)) next.delete(questionId);
            else next.add(questionId);
            return next;
        });
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
        results.questions.forEach((q) => {
            let resultStr = '';
            if (q.distribution) {
                resultStr = q.distribution.map((d) => `${d.option}: ${d.count} (${d.percentage}%)`).join('; ');
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-violet" />
            </div>
        );
    }

    if (!results) {
        return (
            <div className="text-center py-12 contrast-muted">
                No results available yet.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold theme-text-primary">Survey Results</h2>
                    {/* Live indicator */}
                    {isLive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                            <Radio className="w-3 h-3 animate-pulse" />
                            Live
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                            <WifiOff className="w-3 h-3" />
                            Offline
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {lastRefreshed && (
                        <span className="text-xs contrast-muted">
                            Updated {lastRefreshed.toLocaleTimeString()}
                        </span>
                    )}
                    <Button variant="ghost" onClick={() => fetchData()} title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="secondary" onClick={exportResults}>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
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
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="rounded-xl p-4 border theme-border theme-card">
                            <div className="flex items-center gap-2 contrast-muted mb-2">
                                <Users className="w-4 h-4" />
                                <span className="text-sm">Participants</span>
                            </div>
                            <div className="text-2xl font-bold theme-text-primary">
                                {progress.total_participants}
                            </div>
                        </div>
                        <div className="rounded-xl p-4 border theme-border theme-card">
                            <div className="flex items-center gap-2 contrast-muted mb-2">
                                <BarChart3 className="w-4 h-4" />
                                <span className="text-sm">Started</span>
                            </div>
                            <div className="text-2xl font-bold text-yellow-400">
                                {progress.started_count}
                            </div>
                        </div>
                        <div className="rounded-xl p-4 border theme-border theme-card">
                            <div className="flex items-center gap-2 contrast-muted mb-2">
                                <BarChart3 className="w-4 h-4" />
                                <span className="text-sm">Completed</span>
                            </div>
                            <div className="text-2xl font-bold text-green-400">
                                {progress.completed_count}
                            </div>
                        </div>
                        <div className="rounded-xl p-4 border theme-border theme-card">
                            <div className="flex items-center gap-2 contrast-muted mb-2">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">Avg. Time</span>
                            </div>
                            <div className="text-2xl font-bold theme-text-primary">
                                {progress.average_time_seconds
                                    ? formatTime(progress.average_time_seconds)
                                    : '--'}
                            </div>
                        </div>
                    </div>

                    {/* Completion rate bar */}
                    <div className="rounded-xl p-4 border theme-border theme-card">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium theme-text-primary">
                                Completion rate
                            </span>
                            <span className="text-sm font-bold text-brand-violet">
                                {progress.completion_rate}%
                            </span>
                        </div>
                        <div className="h-3 theme-bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-brand-violet to-purple-400 rounded-full transition-all duration-700"
                                style={{ width: `${progress.completion_rate}%` }}
                            />
                        </div>
                        <p className="text-xs contrast-muted mt-1.5">
                            {progress.completed_count} of {progress.total_participants} participants completed
                        </p>
                    </div>

                    {/* Per-participant status (collapsible) */}
                    {progress.participants && progress.participants.length > 0 && (
                        <div className="rounded-xl border theme-border theme-card overflow-hidden">
                            <button
                                onClick={() => setShowParticipants((v) => !v)}
                                className="w-full flex items-center justify-between px-4 py-3 theme-hover transition-colors text-left"
                            >
                                <span className="text-sm font-medium theme-text-primary flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Participant Status
                                </span>
                                {showParticipants
                                    ? <ChevronUp className="w-4 h-4 contrast-muted" />
                                    : <ChevronDown className="w-4 h-4 contrast-muted" />}
                            </button>
                            {showParticipants && (
                                <div className="border-t theme-border divide-y" style={{ borderColor: 'var(--theme-border-color)' }}>
                                    {progress.participants.map((p) => (
                                        <div key={p.participant_id} className="flex items-center justify-between px-4 py-2.5">
                                            <span className="text-sm theme-text-primary">{p.participant_name}</span>
                                            <StatusPill status={p.status} currentQuestion={p.current_question} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Question Results */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold contrast-muted uppercase tracking-wide">
                    Question Breakdown
                </h3>
                {results.questions.length === 0 ? (
                    <div className="rounded-xl p-8 text-center border theme-border theme-card contrast-muted">
                        No questions in this survey yet.
                    </div>
                ) : (
                    results.questions.map((question, index) => (
                        <div
                            key={question.question_id}
                            className="rounded-xl border theme-border theme-card overflow-hidden"
                        >
                            {/* Question Header */}
                            <button
                                onClick={() => toggleQuestion(question.question_id)}
                                className="w-full flex items-center gap-3 p-4 theme-hover transition-colors text-left"
                            >
                                <span className="text-sm font-mono text-brand-violet font-bold min-w-[24px]">
                                    Q{index + 1}
                                </span>
                                <span className="flex-1 theme-text-primary text-sm">{question.text}</span>
                                <span className="text-xs contrast-muted whitespace-nowrap">
                                    {question.response_count} response{question.response_count !== 1 ? 's' : ''}
                                </span>
                                {expandedQuestions.has(question.question_id)
                                    ? <ChevronUp className="w-4 h-4 contrast-muted flex-shrink-0" />
                                    : <ChevronDown className="w-4 h-4 contrast-muted flex-shrink-0" />}
                            </button>

                            {/* Question Body */}
                            {expandedQuestions.has(question.question_id) && (
                                <div className="p-4 border-t theme-border">
                                    {question.response_count === 0 ? (
                                        <p className="text-center py-6 contrast-muted text-sm">
                                            No responses yet
                                        </p>
                                    ) : (
                                        <>
                                            {/* Choice distribution */}
                                            {question.distribution && question.distribution.length > 0 && (
                                                <div className="space-y-3">
                                                    {question.distribution.map((item, idx) => (
                                                        <div key={idx}>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-sm theme-text-primary">{item.option}</span>
                                                                <span className="text-sm contrast-muted">
                                                                    {item.count} ({item.percentage}%)
                                                                </span>
                                                            </div>
                                                            <div className="h-5 theme-bg-secondary rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-brand-violet to-purple-400 rounded-full transition-all duration-500"
                                                                    style={{ width: `${item.percentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Rating average */}
                                            {question.average !== undefined && (
                                                <div className="flex items-center gap-8">
                                                    <div className="text-center">
                                                        <div className="flex items-center gap-1 justify-center mb-1">
                                                            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                                            <span className="text-3xl font-bold theme-text-primary">
                                                                {question.average}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs contrast-muted">Average</span>
                                                    </div>
                                                    {question.median !== undefined && (
                                                        <div className="text-center">
                                                            <div className="text-3xl font-bold theme-text-primary mb-1">
                                                                {question.median}
                                                            </div>
                                                            <span className="text-xs contrast-muted">Median</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Text responses */}
                                            {question.responses && question.responses.length > 0 && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 contrast-muted mb-2">
                                                        <MessageSquare className="w-4 h-4" />
                                                        <span className="text-sm">
                                                            Text Responses ({question.responses.length})
                                                        </span>
                                                    </div>
                                                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                                                        {question.responses.map((response, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="p-3 theme-bg-secondary rounded-lg text-sm theme-text-secondary border theme-border"
                                                            >
                                                                "{response}"
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Word frequency cloud */}
                                                    {question.word_frequency && question.word_frequency.length > 0 && (
                                                        <div className="mt-4 pt-4 border-t theme-border">
                                                            <h4 className="text-xs contrast-muted mb-3 uppercase tracking-wide">
                                                                Common Words
                                                            </h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {question.word_frequency.slice(0, 20).map((word, idx) => (
                                                                    <span
                                                                        key={idx}
                                                                        className="px-2 py-1 bg-brand-violet/10 text-brand-violet rounded text-sm"
                                                                        style={{
                                                                            fontSize: `${Math.max(11, Math.min(22, 11 + word.count * 2))}px`,
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
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            {lastRefreshed && (
                <div className="text-center text-xs contrast-muted">
                    Last updated: {lastRefreshed.toLocaleTimeString()}
                    {isLive && <span className="ml-2 text-green-400">· Updates automatically</span>}
                </div>
            )}
        </div>
    );
}

// ── Small helper component ───────────────────────────────────────────────────

function StatusPill({
    status,
    currentQuestion,
}: {
    status: string;
    currentQuestion?: number | null;
}) {
    const config: Record<string, { label: string; classes: string }> = {
        completed: { label: 'Completed', classes: 'bg-green-500/10 text-green-400 border-green-500/20' },
        in_progress: {
            label: currentQuestion != null ? `Q${currentQuestion + 1}` : 'In progress',
            classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        },
        not_started: { label: 'Not started', classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
    };
    const { label, classes } = config[status] ?? config['not_started'];
    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${classes}`}>
            {label}
        </span>
    );
}
