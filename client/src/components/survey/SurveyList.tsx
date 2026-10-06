import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    FileText,
    Play,
    Pause,
    Square,
    BarChart3,
    Edit,
    Trash2,
    Clock,
    Users,
    AlertTriangle,
    X,
    Loader2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { API_BASE_URL } from '../../lib/config';
import { apiErrorText } from '../../lib/apiErrors';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Survey {
    id: string;
    title: string;
    status: string;
    question_count: number;
    response_count: number;
    created_at: string;
    activated_at: string | null;
}

interface DeleteTarget {
    id: string;
    title: string;
    status: string;
    response_count: number;
}

interface SurveyListProps {
    workshopId: string;
    onCreateSurvey: () => void;
    onEditSurvey: (surveyId: string) => void;
    onViewResults: (surveyId: string) => void;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    DRAFT:    { color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',     icon: FileText, label: 'Draft' },
    ACTIVE:   { color: 'text-green-400 bg-green-500/10 border-green-500/20',   icon: Play,     label: 'Active' },
    PAUSED:   { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: Pause,    label: 'Paused' },
    CLOSED:   { color: 'text-red-400 bg-red-500/10 border-red-500/20',         icon: Square,   label: 'Closed' },
    ARCHIVED: { color: 'text-gray-500 bg-gray-500/10 border-gray-500/20',      icon: FileText, label: 'Archived' },
};

// Statuses that can be deleted
const DELETABLE = new Set(['DRAFT', 'PAUSED', 'CLOSED']);

// ── Component ─────────────────────────────────────────────────────────────────

export function SurveyList({ workshopId, onCreateSurvey, onEditSurvey, onViewResults }: SurveyListProps) {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchSurveys();
    }, [workshopId]);

    const fetchSurveys = async () => {
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/surveys/workshop/${workshopId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            if (response.ok) {
                const data = await response.json();
                setSurveys(data.surveys || []);
            }
        } catch {
            toast.error('Failed to load surveys');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (
        surveyId: string,
        action: 'activate' | 'pause' | 'resume' | 'close'
    ) => {
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            if (response.ok) {
                toast.success(`Survey ${action}d successfully`);
                fetchSurveys();
            } else {
                const error = await response.json();
                toast.error(apiErrorText(error) || `Failed to ${action} survey`);
            }
        } catch {
            toast.error(`Failed to ${action} survey`);
        }
    };

    const confirmDelete = (survey: Survey) => {
        setDeleteTarget({
            id: survey.id,
            title: survey.title,
            status: survey.status,
            response_count: survey.response_count,
        });
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/surveys/${deleteTarget.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            if (response.ok) {
                toast.success(`"${deleteTarget.title}" deleted`);
                setDeleteTarget(null);
                fetchSurveys();
            } else {
                const error = await response.json();
                toast.error(apiErrorText(error) || 'Failed to delete survey');
            }
        } catch {
            toast.error('Failed to delete survey');
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-violet" />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold theme-text-primary">Surveys</h3>
                    <Button onClick={onCreateSurvey} className="text-sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Create Survey
                    </Button>
                </div>

                {surveys.length === 0 ? (
                    <div className="text-center py-12 border border-dashed theme-border rounded-xl theme-bg-secondary">
                        <FileText className="w-12 h-12 mx-auto mb-3 contrast-muted" />
                        <p className="theme-text-secondary mb-4">No surveys yet</p>
                        <Button variant="secondary" onClick={onCreateSurvey}>
                            Create your first survey
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {surveys.map((survey) => {
                            const cfg = STATUS_CONFIG[survey.status] ?? STATUS_CONFIG.DRAFT;
                            const StatusIcon = cfg.icon;
                            const canDelete = DELETABLE.has(survey.status);

                            return (
                                <div
                                    key={survey.id}
                                    className="rounded-xl border theme-border theme-card p-4 hover:border-brand-violet/30 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <h4 className="font-medium theme-text-primary truncate">
                                                    {survey.title}
                                                </h4>
                                                <span
                                                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}
                                                >
                                                    <StatusIcon className="w-3 h-3" />
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm contrast-muted flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <FileText className="w-3.5 h-3.5" />
                                                    {survey.question_count} question{survey.question_count !== 1 ? 's' : ''}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {survey.response_count} response{survey.response_count !== 1 ? 's' : ''}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatDate(survey.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                                            {/* Status actions */}
                                            {survey.status === 'DRAFT' && (
                                                <Button
                                                    variant="secondary"
                                                    className="text-xs h-8"
                                                    onClick={() => handleStatusChange(survey.id, 'activate')}
                                                >
                                                    <Play className="w-3 h-3 mr-1" />
                                                    Activate
                                                </Button>
                                            )}
                                            {survey.status === 'ACTIVE' && (
                                                <>
                                                    <Button
                                                        variant="secondary"
                                                        className="text-xs h-8"
                                                        onClick={() => handleStatusChange(survey.id, 'pause')}
                                                    >
                                                        <Pause className="w-3 h-3 mr-1" />
                                                        Pause
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        className="text-xs h-8 text-red-400"
                                                        onClick={() => handleStatusChange(survey.id, 'close')}
                                                    >
                                                        <Square className="w-3 h-3 mr-1" />
                                                        Close
                                                    </Button>
                                                </>
                                            )}
                                            {survey.status === 'PAUSED' && (
                                                <>
                                                    <Button
                                                        variant="secondary"
                                                        className="text-xs h-8"
                                                        onClick={() => handleStatusChange(survey.id, 'resume')}
                                                    >
                                                        <Play className="w-3 h-3 mr-1" />
                                                        Resume
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        className="text-xs h-8 text-red-400"
                                                        onClick={() => handleStatusChange(survey.id, 'close')}
                                                    >
                                                        <Square className="w-3 h-3 mr-1" />
                                                        Close
                                                    </Button>
                                                </>
                                            )}

                                            {/* View results */}
                                            {survey.response_count > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    className="text-xs h-8"
                                                    onClick={() => onViewResults(survey.id)}
                                                    title="View Results"
                                                >
                                                    <BarChart3 className="w-4 h-4" />
                                                </Button>
                                            )}

                                            {/* Edit (draft only) */}
                                            {survey.status === 'DRAFT' && (
                                                <Button
                                                    variant="ghost"
                                                    className="text-xs h-8"
                                                    onClick={() => onEditSurvey(survey.id)}
                                                    title="Edit Survey"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                            )}

                                            {/* Delete (DRAFT, PAUSED, CLOSED) */}
                                            {canDelete && (
                                                <Button
                                                    variant="ghost"
                                                    className="text-xs h-8 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                                    onClick={() => confirmDelete(survey)}
                                                    title="Delete Survey"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Delete confirmation modal */}
            {deleteTarget && (
                <DeleteConfirmModal
                    target={deleteTarget}
                    isDeleting={isDeleting}
                    onConfirm={executeDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </>
    );
}

// ── DeleteConfirmModal ────────────────────────────────────────────────────────

function DeleteConfirmModal({
    target,
    isDeleting,
    onConfirm,
    onCancel,
}: {
    target: DeleteTarget;
    isDeleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const hasResponses = target.response_count > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl shadow-xl border theme-card theme-bg-primary overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b theme-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-500/10">
                            <Trash2 className="w-5 h-5 text-red-400" />
                        </div>
                        <h2 className="text-lg font-semibold theme-text-primary">Delete Survey</h2>
                    </div>
                    <button aria-label="Close"
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="p-2 rounded-lg theme-hover transition-colors"
                    >
                        <X className="w-5 h-5 theme-text-secondary" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    <p className="text-sm theme-text-secondary">
                        You are about to permanently delete:
                    </p>
                    <div className="rounded-xl p-4 theme-bg-secondary border theme-border">
                        <p className="font-semibold theme-text-primary">{target.title}</p>
                        <p className="text-xs contrast-muted mt-1 capitalize">
                            Status: {target.status.toLowerCase()}
                            {target.response_count > 0 && (
                                <> · {target.response_count} response{target.response_count !== 1 ? 's' : ''}</>
                            )}
                        </p>
                    </div>

                    {/* Warning when there are responses */}
                    {hasResponses && (
                        <div className="flex items-start gap-3 rounded-xl p-4 bg-red-500/5 border border-red-500/20">
                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-400">
                                    Response data will be permanently lost
                                </p>
                                <p className="text-xs text-red-400/80 mt-0.5">
                                    This survey has {target.response_count} recorded response
                                    {target.response_count !== 1 ? 's' : ''}.
                                    Deleting it will permanently remove all answers and cannot be undone.
                                </p>
                            </div>
                        </div>
                    )}

                    {!hasResponses && (
                        <p className="text-sm contrast-muted">
                            This action cannot be undone.
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 flex items-center justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-lg border theme-border theme-text-secondary theme-hover text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                {hasResponses ? 'Delete & Lose Responses' : 'Delete Survey'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
