/**
 * WorkshopPlannerPanel — shows Challenge Planner sessions linked to a workshop.
 * Facilitators can expand each session and copy individual step prompts for use
 * during the live workshop.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Loader2,
  RotateCcw,
  FileText,
  User,
  Clock,
} from 'lucide-react';
import { challengesApi, type PlannerSessionDetail, type StepGenerationResponse } from '../../lib/api/challenges';
import { toast } from 'sonner';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  workshopId: string;
}

const STEP_LABELS: Record<number, string> = {
  1: 'Widen',
  2: 'Diagnose',
  3: 'Converge',
  4: 'Select & Create Brief',
  5: 'Build',
  6: 'Test & Showcase',
};

const STEP_COLORS: Record<number, string> = {
  1: 'text-violet-500',
  2: 'text-blue-500',
  3: 'text-emerald-500',
  4: 'text-amber-500',
  5: 'text-rose-500',
  6: 'text-cyan-500',
};

const STEP_BG: Record<number, string> = {
  1: 'bg-violet-500/10 border-violet-500/20',
  2: 'bg-blue-500/10 border-blue-500/20',
  3: 'bg-emerald-500/10 border-emerald-500/20',
  4: 'bg-amber-500/10 border-amber-500/20',
  5: 'bg-rose-500/10 border-rose-500/20',
  6: 'bg-cyan-500/10 border-cyan-500/20',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function StepRow({ step, isLight }: { step: StepGenerationResponse; isLight: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const label = STEP_LABELS[step.step_number] ?? step.step_name;

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(step.content);
      setCopied(true);
      toast.success(`Step ${step.step_number} prompt copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className={`rounded-lg border overflow-hidden ${isLight ? 'border-gray-100' : 'border-white/8'}`}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${isLight ? 'hover:bg-gray-50' : 'hover:bg-surface-700/40'}`}
      >
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold font-mono border ${STEP_BG[step.step_number]} ${STEP_COLORS[step.step_number]}`}>
            {step.step_number}
          </span>
          <span className={`text-sm font-medium ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={copy}
            title="Copy prompt"
            className={`p-1.5 rounded-md transition-colors ${copied ? 'text-emerald-500' : isLight ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-100' : 'text-gray-500 hover:text-gray-300 hover:bg-surface-600'}`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {expanded ? <ChevronUp className={`w-4 h-4 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} /> : <ChevronDown className={`w-4 h-4 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} />}
        </div>
      </button>
      {expanded && (
        <div className={`border-t px-4 pb-4 pt-3 ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
          <pre className={`text-xs leading-relaxed whitespace-pre-wrap font-mono rounded-lg p-3 border overflow-auto max-h-72 ${isLight ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-surface-900/60 border-white/10 text-gray-300'}`}>
            {step.content}
          </pre>
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, isLight }: { session: PlannerSessionDetail; isLight: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border overflow-hidden ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className={`w-full text-left px-5 py-4 transition-colors ${isLight ? 'hover:bg-gray-50' : 'hover:bg-surface-700/50'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className={`w-4 h-4 shrink-0 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} />
              <p className={`font-semibold text-sm truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {session.customer_name || 'Unnamed session'}
              </p>
            </div>
            <p className={`text-xs line-clamp-2 pl-6 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
              {session.challenge_description}
            </p>
            <div className={`flex items-center gap-3 text-xs mt-2 pl-6 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(session.created_at)}
              </span>
              {session.created_by_email && (
                <span className="flex items-center gap-1 truncate">
                  <User className="w-3 h-3 shrink-0" />
                  <span className="truncate">{session.created_by_email}</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isLight ? 'bg-violet-50 text-violet-700' : 'bg-violet-900/30 text-violet-400'}`}>
              {session.steps?.length ?? 0} stages
            </span>
            {expanded
              ? <ChevronUp className={`w-4 h-4 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} />
              : <ChevronDown className={`w-4 h-4 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} />}
          </div>
        </div>
      </button>

      {expanded && session.steps && session.steps.length > 0 && (
        <div className={`border-t px-4 pb-4 pt-3 space-y-2 ${isLight ? 'border-gray-100 bg-gray-50/60' : 'border-white/8 bg-surface-900/40'}`}>
          {session.customer_about && (
            <p className={`text-xs mb-3 px-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
              <span className="font-semibold">About:</span> {session.customer_about}
            </p>
          )}
          {session.steps.map(step => (
            <StepRow key={step.step_number} step={step} isLight={isLight} />
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkshopPlannerPanel({ workshopId }: Props) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [sessions, setSessions] = useState<PlannerSessionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await challengesApi.getWorkshopPlannerSessions(workshopId);
      setSessions(data.sessions);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [workshopId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className={`w-5 h-5 ${isLight ? 'text-violet-600' : 'text-violet-400'}`} />
          <h3 className={`text-base font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Planner Prompts
          </h3>
          {sessions.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isLight ? 'bg-violet-50 text-violet-700' : 'bg-violet-900/30 text-violet-400'}`}>
              {sessions.length}
            </span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          title="Refresh"
          className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-700' : 'text-gray-500 hover:bg-surface-700 hover:text-gray-300'}`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
        </button>
      </div>

      {loading && sessions.length === 0 ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className={`w-5 h-5 animate-spin ${isLight ? 'text-gray-400' : 'text-gray-500'}`} />
        </div>
      ) : error ? (
        <div className={`text-sm text-center py-6 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
          Failed to load planner sessions.{' '}
          <button onClick={load} className="underline">Retry</button>
        </div>
      ) : sessions.length === 0 ? (
        <div className={`rounded-xl border border-dashed py-10 text-center ${isLight ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-surface-800/40'}`}>
          <Lightbulb className={`w-8 h-8 mx-auto mb-2 opacity-30 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} />
          <p className={`text-sm font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>No planner prompts linked yet</p>
          <p className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
            Go to <strong>Business Challenge Planner</strong>, select this workshop, and submit a challenge to add prompts here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <SessionCard key={session.id} session={session} isLight={isLight} />
          ))}
        </div>
      )}
    </div>
  );
}
