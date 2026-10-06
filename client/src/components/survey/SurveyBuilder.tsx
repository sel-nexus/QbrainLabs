import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Trash2,
    GripVertical,
    Save,
    Play,
    ChevronDown,
    ChevronUp,
    FileText,
    ListChecks,
    Star,
    Type,
    AlignLeft,
    BarChart3,
    X
} from 'lucide-react';
import { Button } from '../ui/Button';
import { API_BASE_URL } from '../../lib/config';

interface QuestionConfig {
    scale?: number;
    labels?: string[];
    max_length?: number;
    statements?: string[];
}

interface Question {
    id?: string;
    text: string;
    type: string;
    required: boolean;
    options?: string[];
    config?: QuestionConfig;
    order: number;
}

interface SurveySettings {
    anonymous: boolean;
    allow_multiple_submissions: boolean;
    show_results_to_participants: boolean;
    deadline: string | null;
}

interface SurveyBuilderProps {
    workshopId: string;
    surveyId?: string;
    onSave?: (surveyId: string) => void;
    onCancel?: () => void;
}

const QUESTION_TYPES = [
    { value: 'multiple_choice', label: 'Multiple Choice', icon: ListChecks },
    { value: 'multiple_select', label: 'Multiple Select', icon: ListChecks },
    { value: 'rating', label: 'Rating Scale', icon: Star },
    { value: 'text', label: 'Short Text', icon: Type },
    { value: 'textarea', label: 'Long Text', icon: AlignLeft },
    { value: 'likert', label: 'Likert Scale', icon: BarChart3 }
];

export function SurveyBuilder({ workshopId, surveyId, onSave, onCancel }: SurveyBuilderProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [settings, setSettings] = useState<SurveySettings>({
        anonymous: true,
        allow_multiple_submissions: false,
        show_results_to_participants: false,
        deadline: null
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);

    useEffect(() => {
        if (surveyId) {
            fetchSurvey();
        }
        fetchTemplates();
    }, [surveyId]);

    const fetchSurvey = async () => {
        try {
            setLoading(true);
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTitle(data.title);
                setDescription(data.description || '');
                setQuestions(data.questions.map((q: any, idx: number) => ({
                    ...q,
                    order: q.order ?? idx
                })));
                setSettings(data.settings);
            }
        } catch (error) {
            toast.error('Failed to load survey');
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/surveys/templates/list`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTemplates(data.templates || []);
            }
        } catch (error) {
            console.error('Failed to load templates');
        }
    };

    const addQuestion = (type: string) => {
        const newQuestion: Question = {
            text: '',
            type,
            required: true,
            order: questions.length,
            options: type === 'multiple_choice' || type === 'multiple_select' ? ['Option 1', 'Option 2'] : undefined,
            config: type === 'rating' ? { scale: 5, labels: ['1', '2', '3', '4', '5'] } :
                type === 'likert' ? { scale: 5, statements: ['Statement 1'] } :
                    type === 'textarea' ? { max_length: 1000 } : {}
        };
        setQuestions([...questions, newQuestion]);
        setExpandedQuestion(questions.length);
    };

    const updateQuestion = (index: number, updates: Partial<Question>) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], ...updates };
        setQuestions(updated);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
        setExpandedQuestion(null);
    };

    const moveQuestion = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === questions.length - 1)) {
            return;
        }
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        const updated = [...questions];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        updated.forEach((q, i) => q.order = i);
        setQuestions(updated);
        setExpandedQuestion(newIndex);
    };

    const addOption = (questionIndex: number) => {
        const updated = [...questions];
        const options = updated[questionIndex].options || [];
        updated[questionIndex].options = [...options, `Option ${options.length + 1}`];
        setQuestions(updated);
    };

    const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
        const updated = [...questions];
        if (updated[questionIndex].options) {
            updated[questionIndex].options![optionIndex] = value;
            setQuestions(updated);
        }
    };

    const removeOption = (questionIndex: number, optionIndex: number) => {
        const updated = [...questions];
        if (updated[questionIndex].options) {
            updated[questionIndex].options = updated[questionIndex].options!.filter((_, i) => i !== optionIndex);
            setQuestions(updated);
        }
    };

    const saveSurvey = async (activate: boolean = false) => {
        if (!title.trim()) {
            toast.error('Please enter a survey title');
            return;
        }
        if (questions.length === 0) {
            toast.error('Please add at least one question');
            return;
        }
        if (questions.some(q => !q.text.trim())) {
            toast.error('All questions must have text');
            return;
        }

        try {
            setSaving(true);
            const authToken = localStorage.getItem('hm_auth_token');

            const payload = {
                title,
                description,
                questions: questions.map((q, idx) => ({
                    text: q.text,
                    type: q.type,
                    required: q.required,
                    options: q.options,
                    config: q.config,
                    order: idx
                })),
                settings
            };

            let response;
            if (surveyId) {
                response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ title, description, settings })
                });
            } else {
                response = await fetch(`${API_BASE_URL}/api/surveys/workshop/${workshopId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
            }

            if (!response.ok) {
                throw new Error('Failed to save survey');
            }

            const data = await response.json();
            const savedSurveyId = data.id || surveyId;

            if (activate) {
                await fetch(`${API_BASE_URL}/api/surveys/${savedSurveyId}/activate`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                toast.success('Survey saved and activated!');
            } else {
                toast.success('Survey saved as draft');
            }

            if (onSave) {
                onSave(savedSurveyId);
            }
        } catch (error) {
            toast.error('Failed to save survey');
        } finally {
            setSaving(false);
        }
    };

    const applyTemplate = async (templateId: string) => {
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/surveys/templates/${templateId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                const template = await response.json();
                setTitle(template.name);
                setDescription(template.description || '');
                setQuestions(template.questions.map((q: any, idx: number) => ({
                    ...q,
                    order: idx
                })));
                setShowTemplates(false);
                toast.success('Template applied');
            }
        } catch (error) {
            toast.error('Failed to apply template');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                    {surveyId ? 'Edit Survey' : 'Create Survey'}
                </h2>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setShowTemplates(true)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Use Template
                    </Button>
                    {onCancel && (
                        <Button variant="ghost" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                </div>
            </div>

            {/* Survey Details */}
            <div className="bg-surface-800 rounded-xl p-6 border border-white/10 mb-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Survey Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter survey title"
                            className="w-full px-4 py-3 bg-surface-700 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description for participants"
                            rows={2}
                            className="w-full px-4 py-3 bg-surface-700 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Questions */}
            <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-white">Questions</h3>

                {questions.map((question, index) => (
                    <div
                        key={index}
                        className="bg-surface-800 rounded-xl border border-white/10 overflow-hidden"
                    >
                        {/* Question Header */}
                        <div
                            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5"
                            onClick={() => setExpandedQuestion(expandedQuestion === index ? null : index)}
                        >
                            <GripVertical className="w-5 h-5 text-gray-500" />
                            <span className="text-sm font-mono text-purple-400">Q{index + 1}</span>
                            <span className="flex-1 text-white truncate">
                                {question.text || 'Untitled question'}
                            </span>
                            <span className="text-xs text-gray-500 bg-surface-700 px-2 py-1 rounded">
                                {QUESTION_TYPES.find(t => t.value === question.type)?.label}
                            </span>
                            {expandedQuestion === index ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                        </div>

                        {/* Question Editor */}
                        {expandedQuestion === index && (
                            <div className="p-4 border-t border-white/10 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Question Text *
                                    </label>
                                    <input
                                        type="text"
                                        value={question.text}
                                        onChange={(e) => updateQuestion(index, { text: e.target.value })}
                                        placeholder="Enter your question"
                                        className="w-full px-4 py-2 bg-surface-700 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>

                                {/* Options for choice questions */}
                                {(question.type === 'multiple_choice' || question.type === 'multiple_select') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            Options
                                        </label>
                                        <div className="space-y-2">
                                            {question.options?.map((option, optIdx) => (
                                                <div key={optIdx} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={option}
                                                        onChange={(e) => updateOption(index, optIdx, e.target.value)}
                                                        className="flex-1 px-3 py-2 bg-surface-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    />
                                                    <button aria-label="Close"
                                                        onClick={() => removeOption(index, optIdx)}
                                                        className="p-2 text-gray-400 hover:text-red-400"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => addOption(index)}
                                                className="text-sm text-purple-400 hover:text-purple-300"
                                            >
                                                + Add option
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Rating scale config */}
                                {question.type === 'rating' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            Scale (1 to)
                                        </label>
                                        <select
                                            value={question.config?.scale || 5}
                                            onChange={(e) => updateQuestion(index, {
                                                config: { ...question.config, scale: parseInt(e.target.value) }
                                            })}
                                            className="px-3 py-2 bg-surface-700 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value={5}>5</option>
                                            <option value={7}>7</option>
                                            <option value={10}>10</option>
                                        </select>
                                    </div>
                                )}

                                {/* Likert statements */}
                                {question.type === 'likert' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            Statements
                                        </label>
                                        <div className="space-y-2">
                                            {question.config?.statements?.map((stmt, stmtIdx) => (
                                                <div key={stmtIdx} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={stmt}
                                                        onChange={(e) => {
                                                            const newStatements = [...(question.config?.statements || [])];
                                                            newStatements[stmtIdx] = e.target.value;
                                                            updateQuestion(index, {
                                                                config: { ...question.config, statements: newStatements }
                                                            });
                                                        }}
                                                        className="flex-1 px-3 py-2 bg-surface-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    />
                                                    <button aria-label="Close"
                                                        onClick={() => {
                                                            const newStatements = question.config?.statements?.filter((_, i) => i !== stmtIdx);
                                                            updateQuestion(index, {
                                                                config: { ...question.config, statements: newStatements }
                                                            });
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-red-400"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => {
                                                    const newStatements = [...(question.config?.statements || []), 'New statement'];
                                                    updateQuestion(index, {
                                                        config: { ...question.config, statements: newStatements }
                                                    });
                                                }}
                                                className="text-sm text-purple-400 hover:text-purple-300"
                                            >
                                                + Add statement
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Question settings */}
                                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                    <label className="flex items-center gap-2 text-sm text-gray-400">
                                        <input
                                            type="checkbox"
                                            checked={question.required}
                                            onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                                            className="rounded border-gray-600 bg-surface-700 text-purple-500 focus:ring-purple-500"
                                        />
                                        Required
                                    </label>
                                    <div className="flex gap-2">
                                        <button aria-label="Move up"
                                            onClick={() => moveQuestion(index, 'up')}
                                            disabled={index === 0}
                                            className="p-2 text-gray-400 hover:text-white disabled:opacity-30"
                                        >
                                            <ChevronUp className="w-4 h-4" />
                                        </button>
                                        <button aria-label="Move down"
                                            onClick={() => moveQuestion(index, 'down')}
                                            disabled={index === questions.length - 1}
                                            className="p-2 text-gray-400 hover:text-white disabled:opacity-30"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                        <button aria-label="Delete"
                                            onClick={() => removeQuestion(index)}
                                            className="p-2 text-gray-400 hover:text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Add Question */}
                <div className="bg-surface-800/50 rounded-xl border border-dashed border-white/20 p-4">
                    <p className="text-sm text-gray-400 mb-3">Add a question:</p>
                    <div className="flex flex-wrap gap-2">
                        {QUESTION_TYPES.map((type) => (
                            <button
                                key={type.value}
                                onClick={() => addQuestion(type.value)}
                                className="flex items-center gap-2 px-3 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg text-sm text-white transition"
                            >
                                <type.icon className="w-4 h-4 text-purple-400" />
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Settings */}
            <div className="bg-surface-800 rounded-xl p-6 border border-white/10 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Survey Settings</h3>
                <div className="space-y-4">
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={settings.anonymous}
                            onChange={(e) => setSettings({ ...settings, anonymous: e.target.checked })}
                            className="rounded border-gray-600 bg-surface-700 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-white">Anonymous responses</span>
                    </label>
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={settings.allow_multiple_submissions}
                            onChange={(e) => setSettings({ ...settings, allow_multiple_submissions: e.target.checked })}
                            className="rounded border-gray-600 bg-surface-700 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-white">Allow multiple submissions</span>
                    </label>
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={settings.show_results_to_participants}
                            onChange={(e) => setSettings({ ...settings, show_results_to_participants: e.target.checked })}
                            className="rounded border-gray-600 bg-surface-700 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-white">Show results to participants</span>
                    </label>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => saveSurvey(false)} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                </Button>
                <Button onClick={() => saveSurvey(true)} disabled={saving}>
                    <Play className="w-4 h-4 mr-2" />
                    Save & Activate
                </Button>
            </div>

            {/* Template Modal */}
            {showTemplates && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface-800 rounded-xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="text-lg font-semibold text-white">Survey Templates</h3>
                            <button aria-label="Close" onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[60vh]">
                            <div className="grid gap-3">
                                {templates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => applyTemplate(template.id)}
                                        className="text-left p-4 bg-surface-700 hover:bg-surface-600 rounded-lg border border-white/5 transition"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="text-white font-medium">{template.name}</h4>
                                                <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                                            </div>
                                            <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
                                                {template.question_count} questions
                                            </span>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <span className="text-xs text-gray-500 bg-surface-800 px-2 py-0.5 rounded">
                                                {template.industry}
                                            </span>
                                            <span className="text-xs text-gray-500 bg-surface-800 px-2 py-0.5 rounded">
                                                {template.category}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
