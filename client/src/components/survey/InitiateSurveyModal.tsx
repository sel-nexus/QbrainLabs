import { useState } from 'react';
import { toast } from 'sonner';
import {
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Rocket,
  Users,
  FileText,
  Loader2,
  Plus,
  Trash2,
  ListChecks,
  Star,
  Type,
  AlignLeft,
  BarChart3,
  Save,
  Play,
} from 'lucide-react';
import { API_BASE_URL } from '../../lib/config';
import { apiErrorText } from '../../lib/apiErrors';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Workshop {
  id: string;
  title: string;
  pin: string | null;
  status: string;
  participant_count: number;
}

interface QuestionDraft {
  text: string;
  type: string;
  required: boolean;
  options?: string[];
  config?: Record<string, unknown>;
}

interface InitiateSurveyModalProps {
  workshops: Workshop[];
  token: string;
  onClose: () => void;
  onSuccess: (workshopIds: string[]) => void;
}

type Step = 'select' | 'configure' | 'questions';

// ── Constants ─────────────────────────────────────────────────────────────────

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice', icon: ListChecks },
  { value: 'multiple_select', label: 'Multiple Select', icon: ListChecks },
  { value: 'rating',          label: 'Rating Scale',    icon: Star },
  { value: 'text',            label: 'Short Text',      icon: Type },
  { value: 'textarea',        label: 'Long Text',       icon: AlignLeft },
  { value: 'likert',          label: 'Likert Scale',    icon: BarChart3 },
];

function makeQuestion(type: string, order: number): QuestionDraft {
  return {
    text: '',
    type,
    required: true,
    options:
      type === 'multiple_choice' || type === 'multiple_select'
        ? ['Option 1', 'Option 2']
        : undefined,
    config:
      type === 'rating'
        ? { scale: 5 }
        : type === 'likert'
        ? { scale: 5, statements: ['Statement 1'] }
        : type === 'textarea'
        ? { max_length: 1000 }
        : {},
    // order is not stored in the draft object – derived from array index
  };
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function InitiateSurveyModal({
  workshops,
  token,
  onClose,
  onSuccess,
}: InitiateSurveyModalProps) {
  // Step state
  const [step, setStep] = useState<Step>('select');

  // Step 1: workshop selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Step 2: survey meta
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [allowMultiple, setAllowMultiple] = useState(false);

  // Step 3: questions
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────

  const activeWorkshops = workshops.filter(
    (w) => w.status === 'OPEN' || w.status === 'IN_PROGRESS' || w.status === 'DRAFT'
  );
  const allSelected =
    activeWorkshops.length > 0 && selectedIds.size === activeWorkshops.length;
  const selectedWorkshops = activeWorkshops.filter((w) => selectedIds.has(w.id));

  const stepIndex = step === 'select' ? 0 : step === 'configure' ? 1 : 2;

  // ── Step 1 helpers ────────────────────────────────────────────────────────

  const toggleWorkshop = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedIds(
      allSelected ? new Set() : new Set(activeWorkshops.map((w) => w.id))
    );

  // ── Step 3 – question helpers ─────────────────────────────────────────────

  const addQuestion = (type: string) => {
    const q = makeQuestion(type, questions.length);
    setQuestions((prev) => [...prev, q]);
    setExpandedIdx(questions.length);
  };

  const updateQuestion = (idx: number, patch: Partial<QuestionDraft>) =>
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q))
    );

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  };

  const addOption = (qIdx: number) =>
    updateQuestion(qIdx, {
      options: [
        ...(questions[qIdx].options ?? []),
        `Option ${(questions[qIdx].options?.length ?? 0) + 1}`,
      ],
    });

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const opts = [...(questions[qIdx].options ?? [])];
    opts[oIdx] = value;
    updateQuestion(qIdx, { options: opts });
  };

  const removeOption = (qIdx: number, oIdx: number) =>
    updateQuestion(qIdx, {
      options: questions[qIdx].options?.filter((_, i) => i !== oIdx),
    });

  const addStatement = (qIdx: number) => {
    const stmts = [...((questions[qIdx].config?.statements as string[]) ?? [])];
    stmts.push('New statement');
    updateQuestion(qIdx, { config: { ...questions[qIdx].config, statements: stmts } });
  };

  const updateStatement = (qIdx: number, sIdx: number, value: string) => {
    const stmts = [...((questions[qIdx].config?.statements as string[]) ?? [])];
    stmts[sIdx] = value;
    updateQuestion(qIdx, { config: { ...questions[qIdx].config, statements: stmts } });
  };

  const removeStatement = (qIdx: number, sIdx: number) => {
    const stmts = (questions[qIdx].config?.statements as string[])?.filter(
      (_, i) => i !== sIdx
    );
    updateQuestion(qIdx, { config: { ...questions[qIdx].config, statements: stmts } });
  };

  // ── Validation helpers ────────────────────────────────────────────────────

  const validateStep1 = () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one workshop');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!title.trim()) {
      toast.error('Survey title is required');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return false;
    }
    if (questions.some((q) => !q.text.trim())) {
      toast.error('All questions must have a question text');
      return false;
    }
    return true;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (activate: boolean) => {
    if (!validateStep3()) return;

    setIsSubmitting(true);
    const createdIds: string[] = [];
    const failed: string[] = [];

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      settings: { anonymous, allow_multiple_submissions: allowMultiple },
      questions: questions.map((q, idx) => ({
        text: q.text,
        type: q.type,
        required: q.required,
        options: q.options,
        config: q.config,
        order: idx,
      })),
    };

    for (const workshopId of Array.from(selectedIds)) {
      try {
        const createRes = await fetch(
          `${API_BASE_URL}/api/surveys/workshop/${workshopId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );
        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({}));
          throw new Error(apiErrorText(err) ?? 'Failed to create survey');
        }
        const survey = await createRes.json();
        createdIds.push(workshopId);

        if (activate && survey.id) {
          const activateRes = await fetch(
            `${API_BASE_URL}/api/surveys/${survey.id}/activate`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (!activateRes.ok) {
            // Survey created but couldn't activate (shouldn't happen with questions)
            console.warn(`Could not activate survey ${survey.id}`);
          }
        }
      } catch (err: unknown) {
        const wTitle =
          activeWorkshops.find((w) => w.id === workshopId)?.title ?? workshopId;
        failed.push(wTitle);
        console.error(`Failed for workshop ${workshopId}:`, err);
      }
    }

    setIsSubmitting(false);

    if (failed.length > 0) {
      toast.error(`Failed to create survey for: ${failed.join(', ')}`);
    }
    if (createdIds.length > 0) {
      const count = createdIds.length;
      toast.success(
        activate
          ? `Survey launched for ${count} workshop${count > 1 ? 's' : ''}!`
          : `Survey saved as draft for ${count} workshop${count > 1 ? 's' : ''}`
      );
      onSuccess(createdIds);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const modalWidth =
    step === 'questions' ? 'max-w-2xl' : 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className={`w-full ${modalWidth} rounded-2xl shadow-xl border theme-card theme-bg-primary overflow-hidden flex flex-col`}
        style={{ maxHeight: '90vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-violet/10">
              <Rocket className="w-5 h-5 text-brand-violet" />
            </div>
            <div>
              <h2 className="text-lg font-semibold theme-text-primary">Launch Survey</h2>
              <p className="text-xs theme-text-secondary">
                {step === 'select'
                  ? 'Step 1 of 3 — Select workshops'
                  : step === 'configure'
                  ? 'Step 2 of 3 — Configure survey'
                  : 'Step 3 of 3 — Add questions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg theme-hover transition-colors"
          >
            <X className="w-5 h-5 theme-text-secondary" />
          </button>
        </div>

        {/* ── Step indicator ── */}
        <div className="flex px-6 pt-4 gap-1.5 flex-shrink-0">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i <= stepIndex ? 'bg-brand-violet' : 'theme-bg-tertiary'
              }`}
            />
          ))}
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="px-6 py-5 overflow-y-auto flex-1">

          {/* ─── Step 1: Workshop selection ─── */}
          {step === 'select' && (
            <div>
              <p className="text-sm theme-text-secondary mb-4">
                Choose one or more workshops to send this survey to.
              </p>
              {activeWorkshops.length === 0 ? (
                <div className="rounded-xl p-6 text-center theme-bg-secondary border theme-border">
                  <FileText className="w-10 h-10 contrast-muted mx-auto mb-2" />
                  <p className="theme-text-secondary font-medium">No active workshops</p>
                  <p className="text-sm contrast-muted mt-1">
                    You need at least one open or in-progress workshop.
                  </p>
                </div>
              ) : (
                <>
                  <button
                    onClick={toggleAll}
                    className="flex items-center gap-2 text-sm text-brand-violet hover:text-brand-violet/80 mb-3 font-medium"
                  >
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                  <div className="space-y-2">
                    {activeWorkshops.map((workshop) => {
                      const selected = selectedIds.has(workshop.id);
                      return (
                        <button
                          key={workshop.id}
                          onClick={() => toggleWorkshop(workshop.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                            selected
                              ? 'border-brand-violet bg-brand-violet/5'
                              : 'theme-border theme-hover'
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {selected ? (
                              <CheckSquare className="w-5 h-5 text-brand-violet" />
                            ) : (
                              <Square className="w-5 h-5 contrast-muted" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium theme-text-primary text-sm truncate">
                              {workshop.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs contrast-muted flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {workshop.participant_count} participants
                              </span>
                              {workshop.pin && (
                                <span className="text-xs contrast-muted font-mono">
                                  PIN: {workshop.pin}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                              workshop.status === 'IN_PROGRESS'
                                ? 'bg-blue-500/10 text-blue-400'
                                : workshop.status === 'OPEN'
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-gray-500/10 text-gray-400'
                            }`}
                          >
                            {workshop.status}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedIds.size > 0 && (
                    <p className="text-sm text-brand-violet mt-3 font-medium">
                      {selectedIds.size} workshop{selectedIds.size > 1 ? 's' : ''} selected
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── Step 2: Survey details ─── */}
          {step === 'configure' && (
            <div className="space-y-4">
              {/* Selected workshops summary */}
              <div className="rounded-xl p-3 theme-bg-secondary border theme-border">
                <p className="text-xs font-medium theme-text-secondary mb-2 uppercase tracking-wide">
                  Sending to {selectedWorkshops.length} workshop
                  {selectedWorkshops.length > 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedWorkshops.map((w) => (
                    <span
                      key={w.id}
                      className="text-xs px-2 py-1 rounded-lg bg-brand-violet/10 text-brand-violet font-medium"
                    >
                      {w.title}
                    </span>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium theme-text-primary mb-1.5">
                  Survey Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Post-Workshop Feedback"
                  className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-secondary theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/50 placeholder:contrast-muted"
                  maxLength={255}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium theme-text-primary mb-1.5">
                  Description{' '}
                  <span className="text-xs contrast-muted">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the survey purpose..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-secondary theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/50 resize-none placeholder:contrast-muted"
                />
              </div>

              {/* Settings */}
              <div className="rounded-xl p-4 theme-bg-secondary border theme-border space-y-3">
                <p className="text-xs font-medium contrast-muted uppercase tracking-wide">
                  Survey Settings
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="w-4 h-4 accent-brand-violet"
                  />
                  <span className="text-sm theme-text-primary">Anonymous responses</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowMultiple}
                    onChange={(e) => setAllowMultiple(e.target.checked)}
                    className="w-4 h-4 accent-brand-violet"
                  />
                  <span className="text-sm theme-text-primary">Allow multiple submissions</span>
                </label>
              </div>
            </div>
          )}

          {/* ─── Step 3: Question builder ─── */}
          {step === 'questions' && (
            <div className="space-y-4">
              {/* Summary chip */}
              <div className="flex items-center justify-between">
                <p className="text-sm theme-text-secondary">
                  <span className="font-medium theme-text-primary">"{title}"</span>
                  {' '}· {selectedWorkshops.length} workshop
                  {selectedWorkshops.length > 1 ? 's' : ''}
                </p>
                <span className="text-xs contrast-muted">
                  {questions.length} question{questions.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Question list */}
              {questions.length === 0 ? (
                <div className="rounded-xl border border-dashed theme-border p-6 text-center">
                  <p className="text-sm contrast-muted">
                    No questions yet. Add one using the buttons below.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {questions.map((question, idx) => (
                    <QuestionCard
                      key={idx}
                      index={idx}
                      question={question}
                      isExpanded={expandedIdx === idx}
                      onToggle={() =>
                        setExpandedIdx(expandedIdx === idx ? null : idx)
                      }
                      onUpdate={(patch) => updateQuestion(idx, patch)}
                      onRemove={() => removeQuestion(idx)}
                      onAddOption={() => addOption(idx)}
                      onUpdateOption={(oIdx, val) => updateOption(idx, oIdx, val)}
                      onRemoveOption={(oIdx) => removeOption(idx, oIdx)}
                      onAddStatement={() => addStatement(idx)}
                      onUpdateStatement={(sIdx, val) =>
                        updateStatement(idx, sIdx, val)
                      }
                      onRemoveStatement={(sIdx) => removeStatement(idx, sIdx)}
                    />
                  ))}
                </div>
              )}

              {/* Add question type picker */}
              <div className="rounded-xl border border-dashed theme-border p-4">
                <p className="text-xs font-medium contrast-muted uppercase tracking-wide mb-3">
                  Add a question
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUESTION_TYPES.map((qt) => (
                    <button
                      key={qt.value}
                      onClick={() => addQuestion(qt.value)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg theme-bg-secondary theme-hover border theme-border text-sm theme-text-primary transition-colors"
                    >
                      <qt.icon className="w-3.5 h-3.5 text-brand-violet" />
                      {qt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 pb-5 pt-3 border-t theme-border flex items-center justify-between gap-3 flex-shrink-0">
          {/* Left: back / cancel */}
          {step === 'select' ? (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border theme-border theme-text-secondary theme-hover text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={() =>
                setStep(step === 'configure' ? 'select' : 'configure')
              }
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border theme-border theme-text-secondary theme-hover text-sm font-medium transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {/* Right: primary actions */}
          <div className="flex items-center gap-2">
            {step === 'select' && (
              <button
                onClick={() => {
                  if (validateStep1()) setStep('configure');
                }}
                disabled={selectedIds.size === 0 || activeWorkshops.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 'configure' && (
              <button
                onClick={() => {
                  if (validateStep2()) setStep('questions');
                }}
                disabled={!title.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Add Questions
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 'questions' && (
              <>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || questions.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border theme-border theme-text-primary theme-hover text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Draft
                </button>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting || questions.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Launch & Activate
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── QuestionCard sub-component ─────────────────────────────────────────────────

interface QuestionCardProps {
  index: number;
  question: QuestionDraft;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<QuestionDraft>) => void;
  onRemove: () => void;
  onAddOption: () => void;
  onUpdateOption: (oIdx: number, val: string) => void;
  onRemoveOption: (oIdx: number) => void;
  onAddStatement: () => void;
  onUpdateStatement: (sIdx: number, val: string) => void;
  onRemoveStatement: (sIdx: number) => void;
}

function QuestionCard({
  index,
  question,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  onAddStatement,
  onUpdateStatement,
  onRemoveStatement,
}: QuestionCardProps) {
  const typeLabel =
    QUESTION_TYPES.find((t) => t.value === question.type)?.label ?? question.type;

  return (
    <div className="rounded-xl border theme-border theme-card overflow-hidden">
      {/* Card header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 theme-hover transition-colors text-left"
      >
        <span className="text-xs font-mono font-bold text-brand-violet min-w-[24px]">
          Q{index + 1}
        </span>
        <span className="flex-1 text-sm theme-text-primary truncate">
          {question.text || (
            <span className="contrast-muted italic">Untitled question</span>
          )}
        </span>
        <span className="text-xs contrast-muted theme-bg-secondary px-2 py-0.5 rounded-full border theme-border whitespace-nowrap">
          {typeLabel}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 contrast-muted flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 contrast-muted flex-shrink-0" />
        )}
      </button>

      {/* Card body */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t theme-border space-y-3 pt-3">
          {/* Question text */}
          <div>
            <label className="block text-xs font-medium contrast-muted mb-1">
              Question Text <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={question.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Enter your question..."
              autoFocus
              className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-secondary theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/50 placeholder:contrast-muted"
            />
          </div>

          {/* Multiple choice / select options */}
          {(question.type === 'multiple_choice' ||
            question.type === 'multiple_select') && (
            <div>
              <label className="block text-xs font-medium contrast-muted mb-1">
                Options
              </label>
              <div className="space-y-1.5">
                {question.options?.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => onUpdateOption(oIdx, e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border theme-border theme-bg-secondary theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/50"
                    />
                    <button
                      onClick={() => onRemoveOption(oIdx)}
                      className="p-1.5 contrast-muted hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={onAddOption}
                  className="flex items-center gap-1 text-xs text-brand-violet hover:text-brand-violet/80 mt-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add option
                </button>
              </div>
            </div>
          )}

          {/* Rating scale */}
          {question.type === 'rating' && (
            <div>
              <label className="block text-xs font-medium contrast-muted mb-1">
                Scale (1 to)
              </label>
              <select
                value={(question.config?.scale as number) ?? 5}
                onChange={(e) =>
                  onUpdate({
                    config: { ...question.config, scale: Number(e.target.value) },
                  })
                }
                className="px-3 py-1.5 rounded-lg border theme-border theme-bg-secondary theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/50"
              >
                {[5, 7, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Likert statements */}
          {question.type === 'likert' && (
            <div>
              <label className="block text-xs font-medium contrast-muted mb-1">
                Statements
              </label>
              <div className="space-y-1.5">
                {(question.config?.statements as string[] | undefined)?.map(
                  (stmt, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={stmt}
                        onChange={(e) => onUpdateStatement(sIdx, e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border theme-border theme-bg-secondary theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/50"
                      />
                      <button
                        onClick={() => onRemoveStatement(sIdx)}
                        className="p-1.5 contrast-muted hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                )}
                <button
                  onClick={onAddStatement}
                  className="flex items-center gap-1 text-xs text-brand-violet hover:text-brand-violet/80 mt-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add statement
                </button>
              </div>
            </div>
          )}

          {/* Footer: required toggle + delete */}
          <div className="flex items-center justify-between pt-2 border-t theme-border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(e) => onUpdate({ required: e.target.checked })}
                className="w-3.5 h-3.5 accent-brand-violet"
              />
              <span className="text-xs theme-text-secondary">Required</span>
            </label>
            <button
              onClick={onRemove}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
