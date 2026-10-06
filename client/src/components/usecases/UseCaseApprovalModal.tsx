import { useState, useEffect } from 'react';
import {
    X, CheckCircle, XCircle, Loader2, BookOpen, Users,
    AlertTriangle, RotateCcw, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../lib/config';
import { apiErrorText } from '../../lib/apiErrors';

const API_BASE = API_BASE_URL;

interface Workshop {
    id: string;
    title: string;
    status: string;
    current_phase: string;
}

interface UseCase {
    id: string;
    title: string;
    description: string;
    proposed_solution: string | null;
    kpi: string | null;
    target_user: string | null;
    category: string | null;
    status: string;
    created_at: string | null;
    workshop: Workshop;
}

interface KBTemplate {
    id: string;
    title: string;
    description: string;
    industry_name: string;
    category: string;
    complexity: string;
    typical_roi: string;
    relevance_score: number;
}

interface SimilarCase {
    useCase: UseCase;
    score: number;
}

interface Props {
    useCase: UseCase;
    allUseCases: UseCase[];
    token: string;
    onClose: () => void;
    onStatusChange: (id: string, status: string) => void;
}

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'is', 'are',
    'was', 'be', 'with', 'by', 'that', 'this', 'it', 'we', 'our', 'can',
    'will', 'how', 'use', 'using', 'used',
]);

function findSimilarInWorkshop(target: UseCase, allUseCases: UseCase[]): SimilarCase[] {
    const extractWords = (text: string) =>
        new Set(text.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !STOP_WORDS.has(w)));

    const sameWorkshop = allUseCases.filter(
        uc => uc.workshop.id === target.workshop.id && uc.id !== target.id
    );

    const targetWords = extractWords(`${target.title} ${target.description}`);

    return sameWorkshop
        .map(uc => {
            const ucWords = extractWords(`${uc.title} ${uc.description}`);
            const intersection = [...targetWords].filter(w => ucWords.has(w)).length;
            const union = new Set([...targetWords, ...ucWords]).size;
            const score = union > 0 ? Math.round((intersection / union) * 100) : 0;
            return { useCase: uc, score };
        })
        .filter(r => r.score > 15)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
}

function SimilarityBadge({ score }: { score: number }) {
    const color =
        score >= 60 ? 'bg-red-100 text-red-700' :
        score >= 35 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700';
    return (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${color}`}>
            {score}% match
        </span>
    );
}

function StatusPill({ status }: { status: string }) {
    const cls =
        status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
        status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{status}</span>;
}

export function UseCaseApprovalModal({ useCase, allUseCases, token, onClose, onStatusChange }: Props) {
    const [kbTemplates, setKbTemplates] = useState<KBTemplate[]>([]);
    const [kbLoading, setKbLoading] = useState(true);
    const [kbError, setKbError] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showRejectReason, setShowRejectReason] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const similarInWorkshop = findSimilarInWorkshop(useCase, allUseCases);

    useEffect(() => {
        let cancelled = false;
        setKbLoading(true);
        setKbError(false);
        const query = encodeURIComponent(useCase.title);
        fetch(`${API_BASE}/api/knowledge-base/search?query=${query}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => {
                if (!r.ok) throw new Error('failed');
                return r.json();
            })
            .then((data: KBTemplate[]) => { if (!cancelled) setKbTemplates(data.slice(0, 3)); })
            .catch(() => { if (!cancelled) setKbError(true); })
            .finally(() => { if (!cancelled) setKbLoading(false); });
        return () => { cancelled = true; };
    }, [useCase.id, token]);

    const changeStatus = async (newStatus: string) => {
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/api/usecases/${useCase.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(apiErrorText(errBody) || `Server error ${res.status}`);
            }
            const label = newStatus === 'APPROVED' ? 'approved' : 'rejected';
            toast.success(`Use case ${label} successfully`);
            onStatusChange(useCase.id, newStatus);
            onClose();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update status. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = () => changeStatus('APPROVED');
    const handleReject = () => {
        if (!showRejectReason) { setShowRejectReason(true); return; }
        changeStatus('REJECTED');
    };

    const isPending = useCase.status === 'PENDING';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col">

                {/* Header */}
                <div className="sticky top-0 z-10 flex items-start justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t-2xl">
                    <div className="flex-1 pr-4 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <StatusPill status={useCase.status} />
                            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{useCase.workshop.title}</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-snug">{useCase.title}</h2>
                    </div>
                    <button aria-label="Close"
                        onClick={onClose}
                        className="shrink-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* Use Case Details */}
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Problem Statement</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{useCase.description}</p>
                        </div>
                        {useCase.proposed_solution && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Proposed Solution</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{useCase.proposed_solution}</p>
                            </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {useCase.kpi && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">KPI</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{useCase.kpi}</p>
                                </div>
                            )}
                            {useCase.target_user && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Target User</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{useCase.target_user}</p>
                                </div>
                            )}
                            {useCase.category && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">AI Technique</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{useCase.category}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Insights */}
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Insights</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* --- Workshop Duplicates --- */}
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="w-4 h-4 text-blue-500" />
                                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Similar in Workshop</h4>
                                </div>

                                {similarInWorkshop.length === 0 ? (
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                        <CheckCircle className="w-4 h-4 shrink-0" />
                                        <span className="text-sm">No similar submissions found</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 mb-1">
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            <span className="text-xs font-medium">
                                                {similarInWorkshop.length} similar submission{similarInWorkshop.length > 1 ? 's' : ''} found
                                            </span>
                                        </div>
                                        {similarInWorkshop.map(({ useCase: sim, score }) => (
                                            <div key={sim.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{sim.title}</p>
                                                    <StatusPill status={sim.status} />
                                                </div>
                                                <SimilarityBadge score={score} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* --- Knowledge Base Match --- */}
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <BookOpen className="w-4 h-4 text-purple-500" />
                                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Knowledge Base Match</h4>
                                </div>

                                {kbLoading ? (
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Searching Knowledge Base...</span>
                                    </div>
                                ) : kbError ? (
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="text-sm">KB analysis unavailable</span>
                                    </div>
                                ) : kbTemplates.length > 0 ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 mb-1">
                                            <CheckCircle className="w-4 h-4 shrink-0" />
                                            <span className="text-xs font-medium">Proven concept found in KB</span>
                                        </div>
                                        {kbTemplates.map((tmpl) => (
                                            <div key={tmpl.id} className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 flex-1 min-w-0 truncate">{tmpl.title}</p>
                                                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 shrink-0">
                                                        {Math.round(tmpl.relevance_score * 100)}%
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">{tmpl.industry_name} · {tmpl.complexity}</p>
                                                {tmpl.typical_roi && (
                                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">ROI: {tmpl.typical_roi}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-2 text-orange-600 dark:text-orange-400">
                                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span className="text-sm">No matching templates — this may be a novel use case</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Rejection reason input */}
                    {showRejectReason && (
                        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                            <label className="text-sm font-semibold text-red-700 dark:text-red-400 block mb-2">
                                Rejection Reason <span className="font-normal text-xs">(optional)</span>
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                placeholder="Explain why this use case is being rejected..."
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                            />
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        {isPending ? (
                            <div className="flex items-center justify-end gap-3">
                                <button
                                    onClick={showRejectReason ? () => setShowRejectReason(false) : onClose}
                                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                                    disabled={submitting}
                                >
                                    {showRejectReason ? 'Back' : 'Cancel'}
                                </button>

                                {!showRejectReason && (
                                    <button
                                        onClick={() => setShowRejectReason(true)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition"
                                        disabled={submitting}
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                    </button>
                                )}

                                {showRejectReason && (
                                    <button
                                        onClick={handleReject}
                                        className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-50"
                                        disabled={submitting}
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                        Confirm Reject
                                    </button>
                                )}

                                {!showRejectReason && (
                                    <button
                                        onClick={handleApprove}
                                        className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition disabled:opacity-50"
                                        disabled={submitting}
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        Approve
                                    </button>
                                )}
                            </div>
                        ) : (
                            /* Already decided — allow reversing the decision */
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    This use case was <strong>{useCase.status.toLowerCase()}</strong>.
                                </span>
                                <div className="flex items-center gap-2">
                                    {useCase.status === 'APPROVED' && (
                                        <button
                                            onClick={handleReject}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 text-sm font-medium transition disabled:opacity-50"
                                            disabled={submitting}
                                        >
                                            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                            Revoke Approval
                                        </button>
                                    )}
                                    {useCase.status === 'REJECTED' && (
                                        <button
                                            onClick={handleApprove}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 text-sm font-medium transition disabled:opacity-50"
                                            disabled={submitting}
                                        >
                                            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                            Approve Instead
                                        </button>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 text-sm transition"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
