/**
 * SurveyMonitorPanel
 * ------------------
 * Displays all surveys across the facilitator's workshops with real-time
 * response progress. Active surveys receive live updates via Socket.io.
 * Clicking "View Results" opens the full SurveyResults component in a modal.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Radio,
  WifiOff,
  RefreshCw,
  BarChart3,
  Users,
  FileText,
  ExternalLink,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Play,
  Pause,
  Square,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { SurveyResults } from './SurveyResults';
import { API_BASE_URL } from '../../lib/config';
import { socket } from '../../lib/socket';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Workshop {
  id: string;
  title: string;
}

interface SurveySummary {
  id: string;
  workshopId: string;
  workshopTitle: string;
  title: string;
  status: string;
  question_count: number;
  response_count: number;       // completed responses (from list endpoint)
  activated_at: string | null;
  // real-time progress (loaded separately for active surveys)
  progress?: {
    total_participants: number;
    completed_count: number;
    started_count: number;
    completion_rate: number;
  };
}

interface DeleteTarget {
  id: string;
  title: string;
  status: string;
  response_count: number;
  workshopTitle: string;
}

interface SurveyMonitorPanelProps {
  workshops: Workshop[];
  token: string;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ACTIVE:   { label: 'Active',    color: 'bg-green-500/10 text-green-400 border-green-500/20',   icon: Play },
  DRAFT:    { label: 'Draft',     color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',      icon: FileText },
  PAUSED:   { label: 'Paused',    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Pause },
  CLOSED:   { label: 'Closed',    color: 'bg-red-500/10 text-red-400 border-red-500/20',         icon: Square },
  ARCHIVED: { label: 'Archived',  color: 'bg-gray-500/10 text-gray-500 border-gray-500/20',      icon: FileText },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function SurveyMonitorPanel({ workshops, token }: SurveyMonitorPanelProps) {
  const [surveys, setSurveys] = useState<SurveySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isMounted = useRef(true);
  const joinedRooms = useRef<Set<string>>(new Set());

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAllSurveys = useCallback(async () => {
    if (workshops.length === 0) { setLoading(false); return; }

    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch survey lists for all workshops in parallel
      const listResults = await Promise.allSettled(
        workshops.map(async (w) => {
          const res = await fetch(
            `${API_BASE_URL}/api/surveys/workshop/${w.id}`,
            { headers }
          );
          if (!res.ok) return { workshopId: w.id, workshopTitle: w.title, items: [] };
          const data = await res.json();
          return { workshopId: w.id, workshopTitle: w.title, items: data.surveys ?? [] };
        })
      );

      const flat: SurveySummary[] = [];
      for (const r of listResults) {
        if (r.status !== 'fulfilled') continue;
        const { workshopId, workshopTitle, items } = r.value;
        for (const s of items) {
          flat.push({
            id: s.id,
            workshopId,
            workshopTitle,
            title: s.title,
            status: s.status,
            question_count: s.question_count,
            response_count: s.response_count,
            activated_at: s.activated_at ?? null,
          });
        }
      }

      if (!isMounted.current) return;
      setSurveys(flat);

      // Fetch progress for all ACTIVE surveys in parallel
      const activeSurveys = flat.filter((s) => s.status === 'ACTIVE');
      if (activeSurveys.length > 0) {
        const progressResults = await Promise.allSettled(
          activeSurveys.map(async (s) => {
            const res = await fetch(
              `${API_BASE_URL}/api/surveys/${s.id}/progress`,
              { headers }
            );
            if (!res.ok) return { id: s.id, progress: null };
            const data = await res.json();
            return { id: s.id, progress: data };
          })
        );

        if (!isMounted.current) return;
        setSurveys((prev) => {
          const map = new Map(prev.map((s) => [s.id, s]));
          for (const r of progressResults) {
            if (r.status !== 'fulfilled' || !r.value.progress) continue;
            const entry = map.get(r.value.id);
            if (entry) map.set(r.value.id, { ...entry, progress: r.value.progress });
          }
          return Array.from(map.values());
        });
      }
    } catch {
      if (isMounted.current) toast.error('Failed to load surveys');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [workshops, token]);

  // ── Refresh a single survey's progress (called on socket events) ──────────

  const refreshSurveyProgress = useCallback(
    async (surveyId: string) => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/surveys/${surveyId}/progress`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok || !isMounted.current) return;
        const data = await res.json();
        setSurveys((prev) =>
          prev.map((s) => (s.id === surveyId ? { ...s, progress: data } : s))
        );
      } catch { /* silent */ }
    },
    [token]
  );

  // ── Delete survey ─────────────────────────────────────────────────────────

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/surveys/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success(`"${deleteTarget.title}" deleted`);
        setDeleteTarget(null);
        setSurveys((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        // Leave the socket room for the deleted survey
        if (joinedRooms.current.has(deleteTarget.id)) {
          socket.emit('leave_survey', { survey_id: deleteTarget.id });
          joinedRooms.current.delete(deleteTarget.id);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail ?? 'Failed to delete survey');
      }
    } catch {
      toast.error('Failed to delete survey');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    isMounted.current = true;
    fetchAllSurveys();
    return () => { isMounted.current = false; };
  }, [fetchAllSurveys]);

  // ── Socket.io subscriptions ───────────────────────────────────────────────

  useEffect(() => {
    const activeSurveyIds = surveys
      .filter((s) => s.status === 'ACTIVE')
      .map((s) => s.id);

    // Join new rooms
    for (const id of activeSurveyIds) {
      if (!joinedRooms.current.has(id)) {
        socket.emit('join_survey', { survey_id: id });
        joinedRooms.current.add(id);
      }
    }

    // Leave rooms no longer needed
    for (const id of Array.from(joinedRooms.current)) {
      if (!activeSurveyIds.includes(id)) {
        socket.emit('leave_survey', { survey_id: id });
        joinedRooms.current.delete(id);
      }
    }

    const onConnect = () => {
      setIsLive(true);
      // Rejoin all rooms after reconnect
      for (const id of joinedRooms.current) {
        socket.emit('join_survey', { survey_id: id });
      }
    };
    const onDisconnect = () => setIsLive(false);

    const onResponseEvent = (data: { survey_id: string }) => {
      if (data?.survey_id) refreshSurveyProgress(data.survey_id);
    };

    const onStatusChanged = (data: { survey_id: string; new_status: string }) => {
      if (!data?.survey_id) return;
      setSurveys((prev) =>
        prev.map((s) =>
          s.id === data.survey_id ? { ...s, status: data.new_status } : s
        )
      );
      refreshSurveyProgress(data.survey_id);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('survey:response_submitted', onResponseEvent);
    socket.on('survey:participant_completed', onResponseEvent);
    socket.on('survey:participant_started', onResponseEvent);
    socket.on('survey:status_changed', onStatusChanged);
    setIsLive(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('survey:response_submitted', onResponseEvent);
      socket.off('survey:participant_completed', onResponseEvent);
      socket.off('survey:participant_started', onResponseEvent);
      socket.off('survey:status_changed', onStatusChanged);
    };
  }, [surveys, refreshSurveyProgress]);

  // Cleanup all rooms on unmount
  useEffect(() => {
    return () => {
      for (const id of joinedRooms.current) {
        socket.emit('leave_survey', { survey_id: id });
      }
      joinedRooms.current.clear();
    };
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────

  const activeSurveyCount = surveys.filter((s) => s.status === 'ACTIVE').length;

  // Group surveys by workshop, show workshops that have at least one survey
  const grouped: Array<{ workshopId: string; workshopTitle: string; surveys: SurveySummary[] }> = [];
  const seen = new Set<string>();
  for (const s of surveys) {
    if (!seen.has(s.workshopId)) {
      seen.add(s.workshopId);
      grouped.push({
        workshopId: s.workshopId,
        workshopTitle: s.workshopTitle,
        surveys: surveys.filter((x) => x.workshopId === s.workshopId),
      });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Panel ── */}
      <div className="mb-8">
        {/* Panel header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="flex items-center gap-2 group"
            >
              <h2 className="text-xl font-semibold theme-text-primary group-hover:text-brand-violet transition-colors">
                Survey Results Monitor
              </h2>
              {collapsed
                ? <ChevronDown className="w-5 h-5 contrast-muted" />
                : <ChevronUp className="w-5 h-5 contrast-muted" />}
            </button>

            {/* Counts */}
            {!collapsed && activeSurveyCount > 0 && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                {activeSurveyCount} active
              </span>
            )}
            {!collapsed && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full theme-bg-secondary theme-text-secondary border theme-border">
                {surveys.length} total
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
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
            <button
              onClick={() => { setLoading(true); fetchAllSurveys(); }}
              disabled={loading}
              className="p-2 rounded-lg theme-hover transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 theme-text-secondary ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Panel body */}
        {!collapsed && (
          <>
            {loading ? (
              <div className="rounded-xl p-8 text-center shadow-sm border theme-card">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-violet mx-auto" />
                <p className="mt-3 text-sm contrast-muted">Loading surveys...</p>
              </div>
            ) : grouped.length === 0 ? (
              <div className="rounded-xl p-8 text-center shadow-sm border theme-card">
                <BarChart3 className="w-10 h-10 contrast-muted mx-auto mb-3" />
                <p className="theme-text-secondary font-medium">No surveys yet</p>
                <p className="text-sm contrast-muted mt-1">
                  Use "Launch Survey" above to create your first survey.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {grouped.map((group) => (
                  <WorkshopGroup
                    key={group.workshopId}
                    workshopTitle={group.workshopTitle}
                    surveys={group.surveys}
                    onViewResults={(id) => setSelectedSurveyId(id)}
                    onDeleteSurvey={(s) =>
                      setDeleteTarget({
                        id: s.id,
                        title: s.title,
                        status: s.status,
                        response_count: s.response_count,
                        workshopTitle: s.workshopTitle,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Results modal ── */}
      {selectedSurveyId && (
        <ResultsModal
          surveyId={selectedSurveyId}
          surveyTitle={surveys.find((s) => s.id === selectedSurveyId)?.title ?? 'Survey Results'}
          workshopTitle={surveys.find((s) => s.id === selectedSurveyId)?.workshopTitle}
          onClose={() => setSelectedSurveyId(null)}
        />
      )}

      {/* ── Delete confirmation modal ── */}
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

// ── WorkshopGroup sub-component ───────────────────────────────────────────────

function WorkshopGroup({
  workshopTitle,
  surveys,
  onViewResults,
  onDeleteSurvey,
}: {
  workshopTitle: string;
  surveys: SurveySummary[];
  onViewResults: (id: string) => void;
  onDeleteSurvey: (survey: SurveySummary) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold contrast-muted uppercase tracking-wide mb-2 flex items-center gap-2">
        <FileText className="w-3.5 h-3.5" />
        {workshopTitle}
      </p>
      <div className="rounded-xl border theme-border theme-card overflow-hidden divide-y" style={{ borderColor: 'var(--theme-border-color)' }}>
        {surveys.map((survey) => (
          <SurveyRow
            key={survey.id}
            survey={survey}
            onViewResults={() => onViewResults(survey.id)}
            onDelete={() => onDeleteSurvey(survey)}
          />
        ))}
      </div>
    </div>
  );
}

// ── SurveyRow sub-component ───────────────────────────────────────────────────

const DELETABLE_STATUSES = new Set(['DRAFT', 'PAUSED', 'CLOSED']);

function SurveyRow({
  survey,
  onViewResults,
  onDelete,
}: {
  survey: SurveySummary;
  onViewResults: () => void;
  onDelete: () => void;
}) {
  const cfg = STATUS_CFG[survey.status] ?? STATUS_CFG.DRAFT;
  const StatusIcon = cfg.icon;

  const total = survey.progress?.total_participants ?? 0;
  const completed = survey.progress?.completed_count ?? survey.response_count;
  const started = survey.progress?.started_count ?? 0;
  const rate = survey.progress?.completion_rate ?? (total > 0 ? Math.round((completed / total) * 100) : 0);
  const hasProgress = survey.status === 'ACTIVE' || survey.response_count > 0;

  // Format activation time
  const activatedAt = survey.activated_at
    ? new Date(survey.activated_at).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div className="px-5 py-4 theme-hover transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Left: info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium theme-text-primary text-sm truncate">
              {survey.title}
            </span>
            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}
            >
              <StatusIcon className="w-3 h-3" />
              {cfg.label}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs contrast-muted mb-2">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {survey.question_count} question{survey.question_count !== 1 ? 's' : ''}
            </span>
            {activatedAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Active since {activatedAt}
              </span>
            )}
          </div>

          {/* Progress bar (shown for active surveys or those with responses) */}
          {hasProgress && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="contrast-muted">
                  {survey.status === 'ACTIVE' ? (
                    <>
                      <span className="text-green-400 font-medium">{completed}</span> completed
                      {started > completed && (
                        <span className="ml-2 text-yellow-400 font-medium">
                          · {started - completed} in progress
                        </span>
                      )}
                      {total > 0 && <span className="ml-1 contrast-muted">/ {total} participants</span>}
                    </>
                  ) : (
                    <><span className="font-medium theme-text-primary">{completed}</span> responses</>
                  )}
                </span>
                {total > 0 && (
                  <span className="font-semibold text-brand-violet">{rate}%</span>
                )}
              </div>
              {total > 0 && (
                <div className="h-2 theme-bg-secondary rounded-full overflow-hidden">
                  {/* Completed portion */}
                  <div className="h-full relative rounded-full overflow-hidden">
                    {/* In-progress portion (yellow) */}
                    {started > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 bg-yellow-400/40 rounded-full transition-all duration-700"
                        style={{ width: `${Math.round((started / total) * 100)}%` }}
                      />
                    )}
                    {/* Completed portion (violet) */}
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-violet to-purple-400 rounded-full transition-all duration-700"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex-shrink-0 flex items-center gap-2 pt-0.5">
          <Users className="w-4 h-4 contrast-muted" />
          <span className="text-sm font-semibold theme-text-primary min-w-[24px] text-right">
            {total > 0 ? total : survey.response_count}
          </span>
          <button
            onClick={onViewResults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-violet/10 text-brand-violet hover:bg-brand-violet/20 transition-colors text-xs font-medium border border-brand-violet/20"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            View Results
          </button>
          {DELETABLE_STATUSES.has(survey.status) && (
            <button
              onClick={onDelete}
              title="Delete survey"
              className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors border border-red-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DeleteConfirmModal sub-component ─────────────────────────────────────────

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl shadow-xl border theme-card theme-bg-primary overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold theme-text-primary">Delete Survey</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-2 rounded-lg theme-hover transition-colors"
          >
            <X className="w-5 h-5 theme-text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm theme-text-secondary">You are about to permanently delete:</p>
          <div className="rounded-xl p-4 theme-bg-secondary border theme-border">
            <p className="font-semibold theme-text-primary">{target.title}</p>
            <p className="text-xs contrast-muted mt-1">
              {target.workshopTitle} · Status: {target.status.toLowerCase()}
              {target.response_count > 0 && (
                <> · {target.response_count} response{target.response_count !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>

          {hasResponses && (
            <div className="flex items-start gap-3 rounded-xl p-4 bg-red-500/5 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">Response data will be permanently lost</p>
                <p className="text-xs text-red-400/80 mt-0.5">
                  This survey has {target.response_count} recorded response
                  {target.response_count !== 1 ? 's' : ''}. Deleting it will permanently remove all
                  answers and cannot be undone.
                </p>
              </div>
            </div>
          )}

          {!hasResponses && (
            <p className="text-sm contrast-muted">This action cannot be undone.</p>
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

// ── ResultsModal sub-component ────────────────────────────────────────────────

function ResultsModal({
  surveyId,
  surveyTitle,
  workshopTitle,
  onClose,
}: {
  surveyId: string;
  surveyTitle: string;
  workshopTitle?: string;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-8 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl shadow-2xl border theme-card theme-bg-primary overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border">
          <div>
            <h2 className="text-lg font-semibold theme-text-primary">{surveyTitle}</h2>
            {workshopTitle && (
              <p className="text-xs contrast-muted mt-0.5 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                {workshopTitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg theme-hover transition-colors"
          >
            <X className="w-5 h-5 theme-text-secondary" />
          </button>
        </div>

        {/* SurveyResults content */}
        <div className="p-6">
          <SurveyResults surveyId={surveyId} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
