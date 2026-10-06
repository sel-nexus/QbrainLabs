import { useEffect, useId, useRef, useState } from 'react';
import { Button } from './ui/Button';
import { api } from '../lib/api';
import { Loader2, Check, Sparkles, AlertTriangle, AlertCircle, Server, Code, Layers, Undo2, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Modal } from './ui/Modal';
import { errorMessage } from '../lib/apiErrors';
import { FIELDS, FIELD_LIMITS, FIELD_ORDER, validateUseCase, type FieldKey } from '../lib/useCaseFields';

export interface UseCaseData {
    title: string;
    description: string;
    proposed_solution: string;
    kpi: string;
    target_user: string;
    category: string;
}

interface UseCaseFormProps {
    workshopId: string;
    onSubmit: (data: UseCaseData) => Promise<void>;
    submitLabel?: string;
    initialData?: Partial<UseCaseData>;
    onSuccess?: () => void;
    /** localStorage key; when set, the form autosaves a draft and restores it. */
    draftKey?: string;
    /** Called when the form goes from empty to having unsaved input, and back. */
    onDirtyChange?: (dirty: boolean) => void;
}

const EMPTY_FORM: UseCaseData = {
    title: '',
    description: '',
    proposed_solution: '',
    kpi: '',
    target_user: '',
    category: '',
};

function readDraft(key?: string): Partial<UseCaseData> | null {
    if (!key) return null;
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

const isDirty = (d: UseCaseData) =>
    !!(d.title || d.description || d.proposed_solution || d.kpi || d.target_user);

type Suggestion = Partial<Record<'title' | 'description' | 'proposed_solution' | 'kpi', string>>;

const AI_BUTTON = 'min-h-[44px] sm:min-h-0 sm:h-8 text-xs py-0 px-3 flex items-center gap-1';

export function UseCaseForm({ workshopId, onSubmit, submitLabel = 'Submit use case', initialData, onSuccess, draftKey, onDirtyChange }: UseCaseFormProps) {
    const formId = useId();
    const [loading, setLoading] = useState(false);
    const [enhancing, setEnhancing] = useState(false);
    const [checkingFeasibility, setCheckingFeasibility] = useState(false);
    const [enhancingBusinessValue, setEnhancingBusinessValue] = useState(false);
    const [feasibilityData, setFeasibilityData] = useState<{ score: string, reason: string } | null>(null);
    const [businessValueData, setBusinessValueData] = useState<any>(null);
    const [duplicateData, setDuplicateData] = useState<any>(null);
    const [generatingArch, setGeneratingArch] = useState(false);
    const [technicalData, setTechnicalData] = useState<any>(null);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
    const [examplesOpen, setExamplesOpen] = useState<Partial<Record<FieldKey, boolean>>>({});
    // AI suggestions are offered next to the participant's text, never applied silently.
    const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
    const [undoSnapshot, setUndoSnapshot] = useState<UseCaseData | null>(null);
    const fieldRefs = useRef<Partial<Record<FieldKey, HTMLInputElement | HTMLTextAreaElement | null>>>({});

    // Form State (restored from an autosaved draft when there is one)
    const [formData, setFormData] = useState<UseCaseData>(() => {
        const source = initialData || readDraft(draftKey) || {};
        return {
            title: source.title || '',
            description: source.description || '', // Problem
            proposed_solution: source.proposed_solution || '',
            kpi: source.kpi || '',
            target_user: source.target_user || '',
            category: source.category || '',
        };
    });
    const [draftRestored] = useState(() => !initialData && !!readDraft(draftKey));

    // Autosave the draft so a refresh, dropped connection or phase change
    // never loses what the participant typed.
    useEffect(() => {
        if (!draftKey) return;
        try {
            if (isDirty(formData)) localStorage.setItem(draftKey, JSON.stringify(formData));
            else localStorage.removeItem(draftKey);
        } catch {
            // storage unavailable (private mode / quota): autosave is best-effort
        }
    }, [draftKey, formData]);

    const dirty = isDirty(formData);
    useEffect(() => {
        onDirtyChange?.(dirty);
    }, [dirty, onDirtyChange]);

    const handleChange = (field: keyof UseCaseData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field as FieldKey]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const handleSubmitClick = async (e: React.FormEvent) => {
        e.preventDefault();
        const found = validateUseCase(formData);
        setErrors(found);
        const firstInvalid = FIELD_ORDER.find((k) => found[k]);
        if (firstInvalid) {
            fieldRefs.current[firstInvalid]?.focus();
            return;
        }
        setLoading(true);

        // 1. Check Duplicates
        try {
            const { data } = await api.post('ai/duplicates', {
                workshop_id: workshopId,
                title: formData.title,
                description: formData.description
            });

            if (data.is_duplicate) {
                setDuplicateData(data);
                setShowDuplicateModal(true);
                setLoading(false);
                return;
            }
        } catch (e) {
            console.error("Duplicate check failed, proceeding anyway", e);
        }

        // 2. Proceed if no duplicates
        await executeSubmit();
    };

    const executeSubmit = async () => {
        setLoading(true);
        try {
            const trimmed = Object.fromEntries(
                Object.entries(formData).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
            ) as unknown as UseCaseData;
            await onSubmit(trimmed);

            // Reset form and drop the saved draft
            setFormData(EMPTY_FORM);
            if (draftKey) {
                try { localStorage.removeItem(draftKey); } catch { /* best-effort */ }
            }

            // Reset AI data
            setBusinessValueData(null);
            setFeasibilityData(null);
            setTechnicalData(null);
            setSuggestion(null);
            setUndoSnapshot(null);
            setShowDuplicateModal(false);

            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            console.error(err);
            // Keep everything the participant typed and say why it failed.
            setShowDuplicateModal(false);
            toast.error(errorMessage(err, 'Could not submit your use case.') + ' Your text has been kept — please try again.');
        } finally {
            setLoading(false);
        }
    };

    const applySuggestion = (fields: (keyof Suggestion)[]) => {
        if (!suggestion) return;
        setUndoSnapshot(formData);
        setFormData(prev => {
            const next = { ...prev };
            fields.forEach((f) => {
                if (suggestion[f]) next[f] = suggestion[f] as string;
            });
            return next;
        });
        const remaining = { ...suggestion };
        fields.forEach((f) => delete remaining[f]);
        setSuggestion(Object.keys(remaining).length ? remaining : null);
    };

    const keepMine = (field: keyof Suggestion) => {
        if (!suggestion) return;
        const remaining = { ...suggestion };
        delete remaining[field];
        setSuggestion(Object.keys(remaining).length ? remaining : null);
    };

    const undo = () => {
        if (!undoSnapshot) return;
        setFormData(undoSnapshot);
        setUndoSnapshot(null);
    };

    const handleEnhance = async () => {
        if (!formData.description) {
            toast.error("Describe the problem first, then AI can suggest improvements.");
            fieldRefs.current.description?.focus();
            return;
        }
        setEnhancing(true);
        try {
            const { data } = await api.post('ai/enhance', { text: formData.description + " " + formData.proposed_solution });
            const proposed: Suggestion = {
                title: data.refined_title || data.title,
                description: data.refined_description || data.description,
                proposed_solution: data.suggested_solution || data.solution,
                kpi: data.kpi,
            };
            // Only offer fields where the AI actually suggests something different.
            const offered = Object.fromEntries(
                Object.entries(proposed).filter(([k, v]) => v && v !== formData[k as keyof UseCaseData])
            ) as Suggestion;
            if (Object.keys(offered).length) setSuggestion(offered);
            else toast.info('AI has no changes to suggest.');
        } catch (e: any) {
            console.error('[UseCaseForm] AI Enhancement error:', e);
            toast.error(errorMessage(e, "AI suggestions aren't available right now."));
        } finally {
            setEnhancing(false);
        }
    };

    const handleFeasibility = async () => {
        if (!formData.proposed_solution) {
            toast.error("Describe how AI could help first.");
            return;
        }
        setCheckingFeasibility(true);
        try {
            const { data } = await api.post('ai/feasibility', { solution: formData.proposed_solution });
            setFeasibilityData({ score: data.score, reason: data.reason });
        } catch (e: any) {
            console.error('[UseCaseForm] Feasibility check error:', e);
            toast.error(errorMessage(e, "Feasibility check failed."));
        } finally {
            setCheckingFeasibility(false);
        }
    };

    const handleBusinessValueEnhancement = async () => {
        if (!formData.title || !formData.description) {
            toast.error("Add a name and describe the problem first.");
            return;
        }
        setEnhancingBusinessValue(true);
        try {
            const { data } = await api.post('ai/business-value', {
                title: formData.title,
                description: formData.description,
                category: formData.category || undefined,
                current_kpi: formData.kpi
            });
            setBusinessValueData(data);
            if (data.enhanced_kpi && data.enhanced_kpi !== formData.kpi) {
                setSuggestion(prev => ({ ...(prev || {}), kpi: data.enhanced_kpi }));
            }
        } catch (e) {
            console.error(e);
            toast.error(errorMessage(e, "Couldn't suggest a measure right now."));
        } finally {
            setEnhancingBusinessValue(false);
        }
    };

    const handleTechnicalDeepDive = async () => {
        if (!formData.title || !formData.proposed_solution) {
            toast.error("Add a name and describe how AI could help first.");
            return;
        }
        setGeneratingArch(true);
        try {
            const { data } = await api.post('ai/technical-analysis', {
                title: formData.title,
                description: formData.description,
                proposed_solution: formData.proposed_solution
            });
            setTechnicalData(data);
        } catch (e) {
            console.error(e);
            toast.error(errorMessage(e, "Technical analysis failed."));
        } finally {
            setGeneratingArch(false);
        }
    };

    const renderField = (key: FieldKey, opts: { multiline?: boolean; action?: React.ReactNode; after?: React.ReactNode } = {}) => {
        const f = FIELDS[key];
        const id = `${formId}-${key}`;
        const value = formData[key];
        const describedBy = [errors[key] ? `${id}-err` : '', f.hint ? `${id}-hint` : '', `${id}-count`].filter(Boolean).join(' ');
        const common = {
            id,
            value,
            placeholder: f.placeholder,
            'aria-invalid': !!errors[key],
            'aria-required': f.required,
            'aria-describedby': describedBy,
            className: `w-full theme-input-bg theme-border border-b-2 px-4 py-3 rounded-t-md theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:border-brand-violet transition-colors ${errors[key] ? 'border-semantic-danger' : ''} ${opts.multiline ? 'min-h-[100px]' : ''}`,
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(key, e.target.value),
        };
        return (
            <div className="space-y-1.5">
                <div className="flex flex-wrap justify-between items-end gap-2">
                    <label htmlFor={id} className="text-sm font-medium theme-text-secondary pl-1">
                        {f.label}{f.required ? <span className="text-semantic-danger" aria-hidden="true"> *</span> : <span className="contrast-muted"> (optional)</span>}
                    </label>
                    {opts.action}
                </div>
                {f.hint && <p id={`${id}-hint`} className="text-xs contrast-muted pl-1">{f.hint}</p>}
                {opts.multiline ? (
                    <textarea ref={(el) => { fieldRefs.current[key] = el; }} {...common} />
                ) : (
                    <input ref={(el) => { fieldRefs.current[key] = el; }} {...common} />
                )}
                <div className="flex justify-between gap-2 text-xs pl-1">
                    <span>
                        {errors[key] && <span id={`${id}-err`} className="text-semantic-danger" role="alert">{errors[key]}</span>}
                        {!errors[key] && f.example && (
                            <button type="button" className="text-brand-violet underline" aria-expanded={!!examplesOpen[key]} onClick={() => setExamplesOpen(p => ({ ...p, [key]: !p[key] }))}>
                                {examplesOpen[key] ? 'Hide example' : 'See an example'}
                            </button>
                        )}
                    </span>
                    <span id={`${id}-count`} className={value.length > FIELD_LIMITS[key] ? 'text-semantic-danger' : 'contrast-muted'}>
                        {value.length}/{FIELD_LIMITS[key]}
                    </span>
                </div>
                {examplesOpen[key] && f.example && (
                    <p className="text-xs rounded-md theme-bg-tertiary p-2 theme-text-secondary flex gap-2">
                        <Lightbulb className="w-4 h-4 shrink-0 text-brand-violet" aria-hidden="true" /> {f.example}
                    </p>
                )}
                {opts.after}
            </div>
        );
    };

    const suggestionLabels: Record<keyof Suggestion, string> = {
        title: 'Name', description: 'Problem', proposed_solution: 'How AI could help', kpi: 'Measure of success',
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmitClick} className="space-y-6" noValidate>
                {draftRestored && (
                    <p className="text-xs rounded-lg px-3 py-2 bg-brand-violet/10 text-brand-violet" role="status">
                        We restored your unsaved draft.
                    </p>
                )}

                {renderField('title')}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField('target_user')}
                    <div className="space-y-1.5">
                        <label htmlFor={`${formId}-category`} className="text-sm font-medium theme-text-secondary pl-1">
                            Type of AI <span className="contrast-muted">(optional)</span>
                        </label>
                        <select
                            id={`${formId}-category`}
                            className="w-full theme-input-bg theme-border border-b-2 px-4 py-3 rounded-t-md theme-text-primary focus:outline-none focus:border-brand-violet transition-colors"
                            value={formData.category}
                            onChange={e => handleChange('category', e.target.value)}
                        >
                            <option value="">Not sure</option>
                            <option>Generative AI</option>
                            <option>Predictive ML</option>
                            <option>Computer Vision</option>
                            <option>Robotics</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>

                {renderField('description', {
                    multiline: true,
                    action: (
                        <Button type="button" variant="secondary" className={`${AI_BUTTON} bg-brand-violet/10 text-brand-violet border-brand-violet/20 hover:bg-brand-violet/20`} onClick={handleEnhance} disabled={enhancing}>
                            {enhancing ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Sparkles className="w-3 h-3" aria-hidden="true" />}
                            Improve with AI
                        </Button>
                    ),
                })}

                {(suggestion || undoSnapshot) && (
                    <section aria-label="AI suggestions" className="rounded-lg border border-brand-violet/30 bg-brand-violet/5 p-4 space-y-3">
                        {suggestion && (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h4 className="text-sm font-semibold text-brand-violet flex items-center gap-1">
                                        <Sparkles className="w-4 h-4" aria-hidden="true" /> AI suggestions
                                    </h4>
                                    <Button type="button" variant="secondary" className="h-8 text-xs px-3" onClick={() => applySuggestion(Object.keys(suggestion) as (keyof Suggestion)[])}>
                                        Use all
                                    </Button>
                                </div>
                                {(Object.keys(suggestion) as (keyof Suggestion)[]).map((field) => (
                                    <div key={field} className="rounded-md theme-bg-primary border theme-border p-3 text-sm space-y-2">
                                        <div className="text-xs font-semibold theme-text-secondary">{suggestionLabels[field]}</div>
                                        <div className="grid sm:grid-cols-2 gap-2">
                                            <div>
                                                <div className="text-[11px] uppercase contrast-muted">Yours</div>
                                                <p className="theme-text-primary whitespace-pre-wrap">{formData[field] || <em className="contrast-muted">empty</em>}</p>
                                            </div>
                                            <div>
                                                <div className="text-[11px] uppercase text-brand-violet">Suggestion</div>
                                                <p className="theme-text-primary whitespace-pre-wrap">{suggestion[field]}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button type="button" className="h-8 text-xs px-3" onClick={() => applySuggestion([field])}>Use suggestion</Button>
                                            <Button type="button" variant="ghost" className="h-8 text-xs px-3" onClick={() => keepMine(field)}>Keep mine</Button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                        {undoSnapshot && (
                            <Button type="button" variant="ghost" className="h-8 text-xs px-3" onClick={undo}>
                                <Undo2 className="w-3 h-3 mr-1" aria-hidden="true" /> Undo AI changes
                            </Button>
                        )}
                    </section>
                )}

                {renderField('proposed_solution', { multiline: true })}

                {renderField('kpi', {
                    action: (
                        <Button type="button" variant="secondary" className={`${AI_BUTTON} bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20`} onClick={handleBusinessValueEnhancement} disabled={enhancingBusinessValue}>
                            {enhancingBusinessValue ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Sparkles className="w-3 h-3" aria-hidden="true" />}
                            Suggest a measure
                        </Button>
                    ),
                    after: businessValueData && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-3 p-4 rounded-lg border theme-border bg-green-500/5"
                        >
                            {businessValueData.business_impact && (
                                <div>
                                    <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Business impact</h4>
                                    <p className="text-sm theme-text-primary">{businessValueData.business_impact}</p>
                                </div>
                            )}
                            {businessValueData.specific_metrics?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Ways to measure it</h4>
                                    <ul className="text-sm theme-text-secondary space-y-1">
                                        {businessValueData.specific_metrics.map((metric: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" aria-hidden="true" />
                                                {metric}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </motion.div>
                    ),
                })}

                {/* Technical analysis is for IT reviewers; business users can skip it. */}
                <details className="rounded-lg border theme-border p-3">
                    <summary className="cursor-pointer text-sm font-medium theme-text-secondary">For IT reviewers (optional)</summary>
                    <div className="mt-3 space-y-3">
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="secondary" className={`${AI_BUTTON} theme-bg-tertiary theme-border`} onClick={handleFeasibility} disabled={checkingFeasibility}>
                                {checkingFeasibility ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <AlertTriangle className="w-3 h-3" aria-hidden="true" />}
                                Check feasibility
                            </Button>
                            <Button type="button" variant="secondary" className={`${AI_BUTTON} bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20`} onClick={handleTechnicalDeepDive} disabled={generatingArch}>
                                {generatingArch ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Server className="w-3 h-3" aria-hidden="true" />}
                                Technical deep dive
                            </Button>
                        </div>
                        {feasibilityData && (
                            <div
                                role="status"
                                className={`text-sm p-3 rounded border ${feasibilityData.score === 'High' ? 'bg-semantic-success/10 border-semantic-success/30 text-semantic-success' :
                                    feasibilityData.score === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600' :
                                        'bg-semantic-danger/10 border-semantic-danger/30 text-semantic-danger'
                                    }`}
                            >
                                <span className="font-bold">Feasibility: {feasibilityData.score}</span> — {feasibilityData.reason}
                            </div>
                        )}
                        {technicalData && (
                            <div className="space-y-4 p-4 rounded-lg border theme-border bg-blue-500/5">
                                <p className="text-sm theme-text-primary font-medium">{technicalData.architecture_overview}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-blue-500/10 p-3 rounded border border-blue-500/20">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Layers className="w-3 h-3 text-blue-500" aria-hidden="true" />
                                            <span className="text-xs font-bold text-blue-500 uppercase">Recommended stack</span>
                                        </div>
                                        <div className="space-y-2">
                                            {technicalData.recommended_stack?.map((item: any, idx: number) => (
                                                <div key={idx} className="text-xs">
                                                    <span className="font-bold theme-text-primary block">{item.category}: {item.name}</span>
                                                    <span className="theme-text-secondary">{item.justification}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-blue-500/10 p-3 rounded border border-blue-500/20">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Code className="w-3 h-3 text-blue-500" aria-hidden="true" />
                                            <span className="text-xs font-bold text-blue-500 uppercase">Implementation steps</span>
                                        </div>
                                        <ol className="text-xs space-y-1.5 list-decimal list-inside theme-text-secondary">
                                            {technicalData.implementation_steps?.map((step: string, idx: number) => (
                                                <li key={idx}><span className="theme-text-primary">{step}</span></li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>
                                {technicalData.technical_risks?.length > 0 && (
                                    <div className="text-xs border border-orange-500/30 bg-orange-500/5 rounded p-2">
                                        <div className="font-bold text-orange-500 mb-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Technical risks
                                        </div>
                                        <ul className="space-y-1 theme-text-secondary">
                                            {technicalData.technical_risks.map((risk: string, idx: number) => <li key={idx}>• {risk}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {typeof technicalData.complexity_score === 'number' && (
                                    <div className="flex items-center justify-between pt-2 border-t theme-border text-xs">
                                        <span className="theme-text-secondary">Estimated complexity</span>
                                        <span className="font-bold theme-text-primary">{technicalData.complexity_score}/10</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </details>

                <div className="pt-4">
                    {Object.values(errors).some(Boolean) && (
                        <p className="text-sm text-semantic-danger mb-2" role="alert">Please fill in the highlighted fields.</p>
                    )}
                    <Button type="submit" className="w-full justify-center h-12 text-lg" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : submitLabel}
                    </Button>
                </div>
            </form>

            <Modal isOpen={showDuplicateModal} onClose={() => setShowDuplicateModal(false)} title="Similar Idea Detected">
                <div className="space-y-4">
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-orange-500">Wait! We found a similar submission.</p>
                            <p className="text-sm theme-text-secondary mt-1">{duplicateData?.message}</p>
                        </div>
                    </div>

                    <div className="theme-bg-tertiary p-4 rounded border theme-border">
                        <h4 className="text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1">Your Title</h4>
                        <p className="font-bold mb-3 theme-text-primary">{formData.title}</p>

                        <h4 className="text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1">Existing Title</h4>
                        <p className="font-bold text-brand-violet">{duplicateData?.similar_to_title}</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setShowDuplicateModal(false)}
                        >
                            Cancel & Edit
                        </Button>
                        <Button
                            className="flex-1 bg-brand-violet hover:bg-brand-violet/90"
                            onClick={executeSubmit}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Submit Anyway'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
