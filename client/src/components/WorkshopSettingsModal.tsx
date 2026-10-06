import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Settings, Lock } from 'lucide-react';
import { CriteriaEditor } from './workshop/CriteriaEditor';
import { type Criterion, type CriteriaAxes, validateCriteria } from '../lib/criteria';
import { errorMessage } from '../lib/apiErrors';

interface LLMModelOption {
    id: string;
    name: string;
    role: 'embedding' | 'decision' | 'reasoning';
    is_active: boolean;
}

interface WorkshopSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    workshop: {
        id: string;
        title: string;
        description?: string;
        status?: string;
        current_phase?: string;
        config?: { criteria?: Criterion[]; x_axis?: string | null; y_axis?: string | null };
    };
    onUpdate: () => void;
}

export function WorkshopSettingsModal({ isOpen, onClose, workshop, onUpdate }: WorkshopSettingsModalProps) {
    const { theme } = useTheme();
    const [title, setTitle] = useState(workshop.title);
    const [description, setDescription] = useState(workshop.description || '');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ title?: string; description?: string; criteria?: string }>({});
    const [llmRegistry, setLlmRegistry] = useState<LLMModelOption[]>([]);
    const [embeddingModelId, setEmbeddingModelId] = useState<string>('');
    const [decisionModelId, setDecisionModelId] = useState<string>('');
    const [reasoningModelId, setReasoningModelId] = useState<string>('');
    // Criteria can be edited until scoring starts (the server also enforces this).
    const criteriaEditable = !workshop.current_phase || workshop.current_phase === 'INTAKE' || workshop.current_phase === 'DRAFT';
    const initialCriteria = workshop.config?.criteria || [];
    const [criteria, setCriteria] = useState<Criterion[]>(initialCriteria);
    const [axes, setAxes] = useState<CriteriaAxes>({ x_axis: workshop.config?.x_axis || null, y_axis: workshop.config?.y_axis || null });
    const criteriaDirty =
        JSON.stringify(criteria) !== JSON.stringify(initialCriteria) ||
        (axes.x_axis || null) !== (workshop.config?.x_axis || null) ||
        (axes.y_axis || null) !== (workshop.config?.y_axis || null);

    // Reset form when workshop changes
    useEffect(() => {
        setTitle(workshop.title);
        setDescription(workshop.description || '');
        setErrors({});
        setCriteria(workshop.config?.criteria || []);
        setAxes({ x_axis: workshop.config?.x_axis || null, y_axis: workshop.config?.y_axis || null });
    }, [workshop]);

    // Load LLM registry and workshop's current selection when modal opens
    useEffect(() => {
        if (!isOpen) return;

        api.get('admin/llm-models').then((res) => {
            setLlmRegistry(res.data.filter((m: LLMModelOption) => m.is_active));
        }).catch((error) => {
            console.error('Failed to load LLM model registry:', error);
        });

        api.get(`workshops/${workshop.id}/llm-models`).then((res) => {
            setEmbeddingModelId(res.data.embedding_model_id || '');
            setDecisionModelId(res.data.decision_model_id || '');
            setReasoningModelId(res.data.reasoning_model_id || '');
        }).catch((error) => {
            console.error('Failed to load workshop LLM model selection:', error);
        });
    }, [isOpen, workshop.id]);

    const validate = () => {
        const newErrors: { title?: string; description?: string; criteria?: string } = {};

        if (!title.trim()) {
            newErrors.title = 'Workshop title is required';
        } else if (title.trim().length < 3) {
            newErrors.title = 'Title must be at least 3 characters';
        } else if (title.trim().length > 200) {
            newErrors.title = 'Title must be less than 200 characters';
        }

        if (description && description.length > 1000) {
            newErrors.description = 'Description must be less than 1000 characters';
        }

        if (criteriaEditable && criteriaDirty && Object.keys(validateCriteria(criteria, axes)).length > 0) {
            newErrors.criteria = 'Fix the scoring criteria before saving';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            return;
        }

        setIsLoading(true);
        try {
            await api.patch(`workshops/${workshop.id}`, {
                title: title.trim(),
                description: description.trim() || null,
            });

            if (criteriaEditable && criteriaDirty) {
                const bothAxes = axes.x_axis && axes.y_axis;
                await api.put(`workshops/${workshop.id}/criteria`, {
                    criteria: criteria.map((c) => ({ ...c, name: c.name.trim() })),
                    x_axis: bothAxes ? axes.x_axis : null,
                    y_axis: bothAxes ? axes.y_axis : null,
                });
            }

            await api.put(`workshops/${workshop.id}/llm-models`, {
                embedding_model_id: embeddingModelId || null,
                decision_model_id: decisionModelId || null,
                reasoning_model_id: reasoningModelId || null,
            });

            toast.success('Workshop settings updated successfully');
            onUpdate(); // Refresh workshop data
            onClose();
        } catch (error: any) {
            console.error('Failed to update workshop settings:', error);
            toast.error(errorMessage(error, 'Failed to update workshop settings'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        // Reset form to original values
        setTitle(workshop.title);
        setDescription(workshop.description || '');
        setErrors({});
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleCancel} title="Workshop Settings">
            <div className="space-y-6">
                {/* Header Icon */}
                <div className="flex items-center gap-3 pb-4 border-b theme-border">
                    <div className="p-3 rounded-lg bg-brand-violet/10">
                        <Settings className="w-6 h-6 text-brand-violet" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold theme-text-primary">Configure Workshop</h3>
                        <p className="text-sm contrast-muted">Update workshop title and description</p>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                    {/* Title Field */}
                    <div>
                        <label
                            htmlFor="workshop-title"
                            className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}
                        >
                            Workshop Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="workshop-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg border transition-colors ${errors.title
                                    ? 'border-red-500 focus:ring-red-500'
                                    : theme === 'light'
                                        ? 'border-gray-300 focus:border-brand-violet focus:ring-brand-violet'
                                        : 'border-white/10 bg-surface-800 focus:border-brand-violet focus:ring-brand-violet'
                                } ${theme === 'light' ? 'bg-white text-gray-900' : 'bg-surface-800 text-white'} focus:outline-none focus:ring-2`}
                            placeholder="Enter workshop title"
                            maxLength={200}
                        />
                        {errors.title && (
                            <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                        )}
                        <p className="mt-1 text-xs contrast-muted">
                            {title.length}/200 characters
                        </p>
                    </div>

                    {/* Description Field */}
                    <div>
                        <label
                            htmlFor="workshop-description"
                            className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}
                        >
                            Description (Optional)
                        </label>
                        <textarea
                            id="workshop-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className={`w-full px-4 py-2 rounded-lg border transition-colors resize-none ${errors.description
                                    ? 'border-red-500 focus:ring-red-500'
                                    : theme === 'light'
                                        ? 'border-gray-300 focus:border-brand-violet focus:ring-brand-violet'
                                        : 'border-white/10 bg-surface-800 focus:border-brand-violet focus:ring-brand-violet'
                                } ${theme === 'light' ? 'bg-white text-gray-900' : 'bg-surface-800 text-white'} focus:outline-none focus:ring-2`}
                            placeholder="Add a description for this workshop (optional)"
                            maxLength={1000}
                        />
                        {errors.description && (
                            <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                        )}
                        <p className="mt-1 text-xs contrast-muted">
                            {description.length}/1000 characters
                        </p>
                    </div>
                </div>

                {/* Scoring criteria (editable until scoring starts) */}
                {initialCriteria.length > 0 && (
                    <div className="space-y-3 pt-4 border-t theme-border">
                        {criteriaEditable ? (
                            <CriteriaEditor
                                criteria={criteria}
                                onChange={setCriteria}
                                axes={axes}
                                onAxesChange={setAxes}
                                showErrors={!!errors.criteria}
                            />
                        ) : (
                            <div>
                                <h4 className="text-sm font-semibold theme-text-secondary mb-2">Scoring criteria</h4>
                                <ul className="text-sm theme-text-primary space-y-1">
                                    {initialCriteria.map((c) => (
                                        <li key={c.name} className="flex justify-between"><span>{c.name}</span><span className="font-mono contrast-muted">{c.weight}%</span></li>
                                    ))}
                                </ul>
                                <p className="mt-2 text-xs contrast-muted flex items-center gap-1">
                                    <Lock className="w-3 h-3" aria-hidden="true" /> Criteria are locked once scoring has started, so results stay consistent.
                                </p>
                            </div>
                        )}
                        {errors.criteria && <p className="text-sm text-red-500" role="alert">{errors.criteria}</p>}
                    </div>
                )}

                {/* AI Models: advanced, collapsed by default */}
                <details className="pt-4 border-t theme-border group">
                    <summary className={`cursor-pointer text-sm font-semibold ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                        Advanced: AI models
                    </summary>
                    <div className="space-y-4 mt-4">
                    <p className="text-xs contrast-muted">Optional. Leave on “Use default” unless your administrator asked you to pick specific models.</p>

                    <div>
                        <label htmlFor="embedding-model" className="block text-sm font-medium mb-2">
                            Embedding Model
                        </label>
                        <select
                            id="embedding-model"
                            aria-label="Embedding Model"
                            value={embeddingModelId}
                            onChange={(e) => setEmbeddingModelId(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border"
                        >
                            <option value="">Use default</option>
                            {llmRegistry.filter((m) => m.role === 'embedding').map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="decision-model" className="block text-sm font-medium mb-2">
                            Decision Model
                        </label>
                        <select
                            id="decision-model"
                            aria-label="Decision Model"
                            value={decisionModelId}
                            onChange={(e) => setDecisionModelId(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border"
                        >
                            <option value="">Use default</option>
                            {llmRegistry.filter((m) => m.role === 'decision').map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="reasoning-model" className="block text-sm font-medium mb-2">
                            Reasoning Model
                        </label>
                        <select
                            id="reasoning-model"
                            aria-label="Reasoning Model"
                            value={reasoningModelId}
                            onChange={(e) => setReasoningModelId(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border"
                        >
                            <option value="">Use default</option>
                            {llmRegistry.filter((m) => m.role === 'reasoning').map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    </div>
                </details>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t theme-border">
                    <Button
                        variant="secondary"
                        onClick={handleCancel}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
