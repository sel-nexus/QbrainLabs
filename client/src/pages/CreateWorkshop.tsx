import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { TemplateSelector } from '../components/templates/TemplateSelector';
import { toast } from 'sonner';
import { CriteriaEditor } from '../components/workshop/CriteriaEditor';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { type Criterion, type CriteriaAxes, validateCriteria } from '../lib/criteria';
import { errorMessage } from '../lib/apiErrors';

const TEMPLATES = {
    CUSTOM: {
        label: 'Simple: value vs. feasibility',
        hint: '2 criteria — quick sessions',
        criteria: [
            { name: 'Feasibility', weight: 50 },
            { name: 'Business Value', weight: 50 },
        ] as Criterion[],
    },
    '7_POINT_COMPREHENSIVE': {
        label: 'Comprehensive',
        hint: '7 criteria scored 1–10 — in-depth assessments',
        criteria: [
            { name: 'Business Impact', weight: 15, description: 'ROI, cost savings, revenue growth, customer satisfaction' },
            { name: 'Strategic Alignment', weight: 15, description: 'Alignment with business goals, executive support' },
            { name: 'Scalability & Value', weight: 14, description: 'Long-term impact, ability to scale' },
            { name: 'Ease of Implementation', weight: 14, description: 'Technical feasibility, integration, resource needs' },
            { name: 'Data Readiness', weight: 14, description: 'Data availability, quality, governance' },
            { name: 'Organizational Readiness', weight: 14, description: 'Leadership buy-in, workforce adaptability' },
            { name: 'Risk & Compliance', weight: 14, description: 'Regulatory, ethical, security considerations' },
        ] as Criterion[],
    },
};
type TemplateKey = keyof typeof TEMPLATES;

const sameCriteria = (a: Criterion[], b: Criterion[]) =>
    a.length === b.length && a.every((c, i) => c.name === b[i].name && Number(c.weight) === Number(b[i].weight));

export function CreateWorkshop() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [template, setTemplate] = useState<TemplateKey>('CUSTOM');
    const [criteria, setCriteria] = useState<Criterion[]>([...TEMPLATES.CUSTOM.criteria]);
    const [axes, setAxes] = useState<CriteriaAxes>({ x_axis: null, y_axis: null });
    const [submitted, setSubmitted] = useState(false);
    // A pending replacement of edited criteria, waiting for confirmation.
    const [pendingReplace, setPendingReplace] = useState<{ label: string; apply: () => void } | null>(null);

    const criteriaErrors = validateCriteria(criteria, axes);
    const titleError = !title.trim() ? 'Give the workshop a title' : '';
    const isValid = !titleError && Object.keys(criteriaErrors).length === 0;
    const criteriaEdited = !sameCriteria(criteria, TEMPLATES[template].criteria);

    const replaceCriteria = (label: string, apply: () => void) => {
        if (criteriaEdited) setPendingReplace({ label, apply });
        else apply();
    };

    const handleTemplateChange = (key: TemplateKey) => {
        if (key === template) return;
        replaceCriteria(TEMPLATES[key].label, () => {
            setTemplate(key);
            setCriteria([...TEMPLATES[key].criteria]);
            setAxes({ x_axis: null, y_axis: null });
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        if (!isValid) return;

        setLoading(true);
        try {
            const bothAxes = axes.x_axis && axes.y_axis;
            const { data } = await api.post('workshops/', {
                title: title.trim(),
                config: {
                    criteria: criteria.map((c) => ({ ...c, name: c.name.trim() })),
                    template_id: template === 'CUSTOM' ? null : template,
                    x_axis: bothAxes ? axes.x_axis : null,
                    y_axis: bothAxes ? axes.y_axis : null,
                },
            });
            toast.success('Workshop created');
            // Land on the new workshop's console, ready to share the PIN.
            navigate(data?.id ? `/workshop/${data.id}?created=1` : '/admin/my-workshops');
        } catch (error) {
            console.error('Failed to create workshop', error);
            toast.error(errorMessage(error, 'Failed to create workshop. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen p-6 max-w-2xl mx-auto ${theme === 'light' ? 'bg-gray-50' : ''}`}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative backdrop-blur-md p-8 rounded-2xl shadow-xl ${theme === 'light'
                    ? 'bg-white border-2 border-gray-200'
                    : 'bg-surface-800/60 border border-white/10'
                    }`}
            >
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/facilitator/dashboard'))}
                    className="absolute top-6 right-6 px-3 py-2"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </Button>
                <h1 className={`text-3xl font-heading font-bold mb-2 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    Create New Workshop
                </h1>
                <p className={`mb-8 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                    Name your session and choose how use cases will be scored. You can change the criteria until scoring starts.
                </p>

                <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                    <div>
                        <Input
                            label="Workshop title *"
                            placeholder="e.g. Q1 AI Roadmap"
                            value={title}
                            maxLength={200}
                            aria-invalid={submitted && !!titleError}
                            aria-describedby={submitted && titleError ? 'title-error' : undefined}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        {submitted && titleError && (
                            <p id="title-error" className="text-xs text-semantic-danger mt-1" role="alert">{titleError}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span id="template-label" className={`text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                                Scoring template
                            </span>
                            <TemplateSelector
                                onSelectTemplate={(templateData) => {
                                    replaceCriteria(templateData.name, () => {
                                        // Never overwrite a title the facilitator already typed.
                                        setTitle((current) => current.trim() ? current : templateData.name);
                                        setCriteria(templateData.criteria);
                                        setTemplate('CUSTOM');
                                        setAxes({ x_axis: null, y_axis: null });
                                    });
                                }}
                            />
                        </div>
                        <div role="radiogroup" aria-labelledby="template-label" className="grid grid-cols-2 gap-4">
                            {(Object.entries(TEMPLATES) as [TemplateKey, typeof TEMPLATES[TemplateKey]][]).map(([key, tmpl]) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="radio"
                                    aria-checked={template === key}
                                    onClick={() => handleTemplateChange(key)}
                                    className={`p-4 rounded-xl border text-left transition-all ${template === key
                                        ? 'bg-brand-violet/20 border-brand-violet text-brand-violet'
                                        : theme === 'light'
                                            ? 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
                                            : 'bg-surface-800 border-white/10 text-gray-300 hover:bg-surface-700'
                                        }`}
                                >
                                    <span className="block text-sm font-semibold">{tmpl.label}</span>
                                    <span className="block text-xs mt-1 opacity-80">{tmpl.hint}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <CriteriaEditor
                        criteria={criteria}
                        onChange={setCriteria}
                        axes={axes}
                        onAxesChange={setAxes}
                        showErrors={submitted}
                    />

                    <div className="pt-4">
                        <Button type="submit" className="w-full justify-center" disabled={loading}>
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Workshop'}
                        </Button>
                        {submitted && !isValid && (
                            <p className="text-center text-sm text-semantic-danger mt-3 font-medium" role="alert">
                                Please fix the highlighted items above.
                            </p>
                        )}
                    </div>
                </form>
            </motion.div>

            <ConfirmationModal
                isOpen={!!pendingReplace}
                onClose={() => setPendingReplace(null)}
                onConfirm={() => pendingReplace?.apply()}
                title="Replace your criteria?"
                message={`Using “${pendingReplace?.label}” replaces the criteria and weights you've edited.`}
                confirmText="Replace criteria"
                cancelText="Keep mine"
                variant="warning"
            />
        </div>
    );
}
