import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { Plus, Trash2, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { TemplateSelector } from '../components/templates/TemplateSelector';

interface Criterion {
    name: string;
    weight: number;
    description?: string;
}

export function CreateWorkshop() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [template, setTemplate] = useState<string>('CUSTOM');
    const [criteria, setCriteria] = useState<Criterion[]>([
        { name: 'Feasibility', weight: 50 },
        { name: 'Business Value', weight: 50 },
    ]);

    const TEMPLATES = {
        'CUSTOM': {
            label: 'Custom / Standard',
            criteria: [
                { name: 'Feasibility', weight: 50 },
                { name: 'Business Value', weight: 50 },
            ]
        },
        '7_POINT_COMPREHENSIVE': {
            label: 'Comprehensive 7-Point (US10)',
            criteria: [
                { name: 'Business Impact', weight: 15, description: "ROI, cost savings, revenue growth, customer satisfaction" },
                { name: 'Strategic Alignment', weight: 15, description: "Alignment with business goals, executive support" },
                { name: 'Scalability & Value', weight: 14, description: "Long-term impact, ability to scale" },
                { name: 'Ease of Implementation', weight: 14, description: "Technical feasibility, integration, resource needs" },
                { name: 'Data Readiness', weight: 14, description: "Data availability, quality, governance" },
                { name: 'Organizational Readiness', weight: 14, description: "Leadership buy-in, workforce adaptability" },
                { name: 'Risk & Compliance', weight: 14, description: "Regulatory, ethical, security considerations" },
            ]
        }
    };

    const handleTemplateChange = (tmplKey: string) => {
        setTemplate(tmplKey);
        // @ts-ignore
        setCriteria([...TEMPLATES[tmplKey].criteria]);
    };

    const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
    const isValid = title.length > 0 && totalWeight === 100;

    const handleAddCriterion = () => {
        setCriteria([...criteria, { name: '', weight: 0 }]);
    };

    const handleRemoveCriterion = (index: number) => {
        setCriteria(criteria.filter((_, i) => i !== index));
    };

    const handleUpdateCriterion = (index: number, field: keyof Criterion, value: string | number) => {
        const newCriteria = [...criteria];
        newCriteria[index] = { ...newCriteria[index], [field]: value };
        setCriteria(newCriteria);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        setLoading(true);
        try {
            await api.post('/workshops/', {
                title,
                config: {
                    criteria,
                    template_id: template === 'CUSTOM' ? null : template
                }
            });
            // Navigate to admin panel after creating workshop
            navigate('/admin/my-workshops');
        } catch (error) {
            console.error("Failed to create workshop", error);
            alert("Failed to create workshop. Check console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen p-6 max-w-2xl mx-auto ${theme === 'light' ? 'bg-gray-50' : ''}`}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`backdrop-blur-md p-8 rounded-2xl shadow-xl ${
                    theme === 'light' 
                        ? 'bg-white border-2 border-gray-200' 
                        : 'bg-surface-800/60 border border-white/10'
                }`}
            >
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                        if (window.history.length > 1) {
                            navigate(-1);
                        } else {
                            navigate('/admin/my-workshops');
                        }
                    }}
                    className="absolute top-6 right-6 px-3 py-2"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </Button>
                {/* Back button now in main Header */}
                <h1 className={`text-3xl font-heading font-bold mb-2 ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                    Create New Workshop
                </h1>
                <p className={`mb-8 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                    Configure your AI strategy session.
                </p>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <Input
                        label="Workshop Title"
                        placeholder="e.g. Q1 AI Roadmap"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className={`text-sm font-medium ${
                                theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                            }`}>
                                Evaluation Template
                            </label>
                            <TemplateSelector
                                onSelectTemplate={(templateData) => {
                                    setTitle(templateData.name);
                                    setCriteria(templateData.criteria);
                                    setTemplate('CUSTOM');
                                }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(TEMPLATES).map(([key, btn]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleTemplateChange(key)}
                                    className={`p-4 rounded-xl border text-sm font-medium transition-all ${
                                        template === key
                                            ? 'bg-brand-violet/20 border-brand-violet text-brand-violet'
                                            : theme === 'light'
                                                ? 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
                                                : 'bg-surface-800 border-white/10 text-gray-300 hover:bg-surface-700'
                                    }`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className={`text-sm font-medium ${
                                theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                            }`}>
                                Scoring Criteria
                            </label>
                            <span className={`text-sm font-mono font-semibold ${totalWeight === 100 ? 'text-semantic-success' : 'text-semantic-warning'}`}>
                                Total: {totalWeight}%
                            </span>
                        </div>

                        {criteria.map((c, idx) => (
                            <div key={idx} className="flex gap-3 items-end">
                                <Input
                                    placeholder="Criteria Name"
                                    className="flex-1"
                                    value={c.name}
                                    onChange={(e) => handleUpdateCriterion(idx, 'name', e.target.value)}
                                />
                                <div className="w-24">
                                    <Input
                                        type="number"
                                        placeholder="%"
                                        className="text-center"
                                        value={c.weight}
                                        onChange={(e) => handleUpdateCriterion(idx, 'weight', Number(e.target.value))}
                                    />
                                </div>
                                {criteria.length > 1 && (
                                    <Button type="button" variant="ghost" className="px-3" onClick={() => handleRemoveCriterion(idx)}>
                                        <Trash2 className="w-5 h-5 text-semantic-danger" />
                                    </Button>
                                )}
                            </div>
                        ))}

                        <Button type="button" variant="secondary" onClick={handleAddCriterion} className="w-full border-dashed">
                            <Plus className="w-4 h-4 mr-2" /> Add Criterion
                        </Button>
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            className="w-full justify-center"
                            disabled={!isValid || loading}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Workshop'}
                        </Button>
                        {totalWeight !== 100 && (
                            <p className="text-center text-sm text-semantic-warning mt-3 font-medium">
                                Total weight must equal 100% (Currently {totalWeight}%)
                            </p>
                        )}
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
