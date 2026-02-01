
import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { api } from '../lib/api';
import { Loader2, Check, Sparkles, AlertTriangle, AlertCircle, Server, Code, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Modal } from './ui/Modal';
import { useTheme } from '../context/ThemeContext';

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
}

export function UseCaseForm({ workshopId, onSubmit, submitLabel = "Submit to Matrix", initialData, onSuccess }: UseCaseFormProps) {
    const { theme } = useTheme();
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

    // Form State
    const [formData, setFormData] = useState<UseCaseData>({
        title: initialData?.title || '',
        description: initialData?.description || '', // Problem
        proposed_solution: initialData?.proposed_solution || '',
        kpi: initialData?.kpi || '',
        target_user: initialData?.target_user || '',
        category: initialData?.category || 'Generative AI'
    });

    const handleChange = (field: keyof UseCaseData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmitClick = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // 1. Check Duplicates
        try {
            const { data } = await api.post('/ai/duplicates', {
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
            await onSubmit(formData);

            // Reset form
            setFormData({
                title: '',
                description: '',
                proposed_solution: '',
                kpi: '',
                target_user: '',
                category: 'Generative AI'
            });

            // Reset AI data
            setBusinessValueData(null);
            setFeasibilityData(null);
            setTechnicalData(null);
            setShowDuplicateModal(false);

            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            console.error(err);
            // Parent handles error toast usually, but we can double safe
        } finally {
            setLoading(false);
        }
    };

    const handleEnhance = async () => {
        console.log('[UseCaseForm] AI Enhance button clicked');
        if (!formData.description) {
            toast.error("Please enter a Problem Statement first.");
            return;
        }
        setEnhancing(true);
        try {
            console.log('[UseCaseForm] Calling /ai/enhance API...');
            const { data } = await api.post('/ai/enhance', { text: formData.description + " " + formData.proposed_solution });
            console.log('[UseCaseForm] AI Enhance response:', data);

            toast.success("AI Enhanced the content!");

            setFormData(prev => ({
                ...prev,
                title: data.refined_title || prev.title || data.title,
                description: data.refined_description || prev.description || data.description,
                proposed_solution: data.suggested_solution || prev.proposed_solution || data.solution,
                kpi: data.kpi || prev.kpi
            }));
        } catch (e: any) {
            console.error('[UseCaseForm] AI Enhancement error:', e);
            console.error('[UseCaseForm] Error details:', e.response?.data || e.message);
            toast.error(e.response?.data?.detail || "AI Enhancement failed.");
        } finally {
            setEnhancing(false);
        }
    };

    const handleFeasibility = async () => {
        console.log('[UseCaseForm] Check Feasibility button clicked');
        if (!formData.proposed_solution) {
            toast.error("Please enter a Proposed Solution first.");
            return;
        }
        setCheckingFeasibility(true);
        try {
            console.log('[UseCaseForm] Calling /ai/feasibility API...');
            const { data } = await api.post('/ai/feasibility', { solution: formData.proposed_solution });
            console.log('[UseCaseForm] Feasibility response:', data);
            setFeasibilityData({ score: data.score, reason: data.reason });
            toast.success(`Feasibility: ${data.score}`);
        } catch (e: any) {
            console.error('[UseCaseForm] Feasibility check error:', e);
            console.error('[UseCaseForm] Error details:', e.response?.data || e.message);
            toast.error(e.response?.data?.detail || "Feasibility check failed.");
        } finally {
            setCheckingFeasibility(false);
        }
    };

    const handleBusinessValueEnhancement = async () => {
        if (!formData.title || !formData.description) {
            toast.error("Please enter a Title and Problem Statement first.");
            return;
        }
        setEnhancingBusinessValue(true);
        try {
            const { data } = await api.post('/ai/business-value', {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                current_kpi: formData.kpi
            });
            setBusinessValueData(data);

            // Auto-populate enhanced KPI
            if (data.enhanced_kpi) {
                setFormData(prev => ({ ...prev, kpi: data.enhanced_kpi }));
            }

            toast.success("Business value enhanced with AI insights!");
        } catch (e) {
            console.error(e);
            toast.error("Business value enhancement failed.");
        } finally {
            setEnhancingBusinessValue(false);
        }
    };

    const handleTechnicalDeepDive = async () => {
        if (!formData.title || !formData.proposed_solution) {
            toast.error("Please enter a Title and Proposed Solution first.");
            return;
        }
        setGeneratingArch(true);
        try {
            const { data } = await api.post('/ai/technical-analysis', {
                title: formData.title,
                description: formData.description,
                proposed_solution: formData.proposed_solution
            });
            setTechnicalData(data);
            toast.success("Technical architecture generated!");
        } catch (e) {
            console.error(e);
            toast.error("Technical analysis failed.");
        } finally {
            setGeneratingArch(false);
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmitClick} className="space-y-6">
                <Input
                    label="Title"
                    placeholder="e.g. Automated Customer Support"
                    value={formData.title}
                    onChange={e => handleChange('title', e.target.value)}
                    required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Target User"
                        placeholder="e.g. Support Agents"
                        value={formData.target_user}
                        onChange={e => handleChange('target_user', e.target.value)}
                        required
                    />
                    <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-sm theme-text-secondary pl-1">AI Technique</label>
                        <select
                            className="w-full theme-input-bg theme-border border-b-2 px-4 py-3 rounded-t-md theme-text-primary focus:outline-none focus:border-brand-violet transition-colors"
                            value={formData.category}
                            onChange={e => handleChange('category', e.target.value)}
                        >
                            <option>Generative AI</option>
                            <option>Predictive ML</option>
                            <option>Computer Vision</option>
                            <option>Robotics</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <label className="text-sm theme-text-secondary pl-1">Problem Statement</label>
                        <Button
                            type="button"
                            variant="secondary"
                            className="h-7 text-xs py-0 px-2 flex items-center gap-1 bg-brand-violet/10 text-brand-violet border-brand-violet/20 hover:bg-brand-violet/20"
                            onClick={handleEnhance}
                            disabled={enhancing}
                        >
                            {enhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            AI Enhance
                        </Button>
                    </div>
                    <textarea
                        className="w-full theme-input-bg theme-border border-b-2 px-4 py-3 rounded-t-md theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:border-brand-violet transition-colors min-h-[100px]"
                        placeholder="Describe the pain point..."
                        value={formData.description}
                        onChange={e => handleChange('description', e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <label className="text-sm theme-text-secondary pl-1">Proposed Solution</label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                className="h-7 text-xs py-0 px-2 flex items-center gap-1 theme-bg-tertiary theme-border"
                                onClick={handleFeasibility}
                                disabled={checkingFeasibility}
                            >
                                {checkingFeasibility ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                                Check Feasibility
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                className="h-7 text-xs py-0 px-2 flex items-center gap-1 bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20"
                                onClick={handleTechnicalDeepDive}
                                disabled={generatingArch}
                            >
                                {generatingArch ? <Loader2 className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3" />}
                                Deep Dive
                            </Button>
                        </div>
                    </div>
                    <textarea
                        className="w-full theme-input-bg theme-border border-b-2 px-4 py-3 rounded-t-md theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:border-brand-violet transition-colors min-h-[100px]"
                        placeholder="How does AI solve it?"
                        value={formData.proposed_solution}
                        onChange={e => handleChange('proposed_solution', e.target.value)}
                    />
                    {feasibilityData && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className={`text-sm p-3 rounded border ${feasibilityData.score === 'High' ? 'bg-semantic-success/10 border-semantic-success/30 text-semantic-success' :
                                feasibilityData.score === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                                    'bg-semantic-danger/10 border-semantic-danger/30 text-semantic-danger'
                                }`}
                        >
                            <span className="font-bold">Feasibility: {feasibilityData.score}</span> — {feasibilityData.reason}
                        </motion.div>
                    )}

                    {technicalData && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-4 p-4 rounded-lg border theme-border bg-blue-500/5 mt-3"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Server className="w-4 h-4 text-blue-500" />
                                <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider">Technical Deep Dive</h4>
                            </div>

                            <div className="text-sm theme-text-primary">
                                <p className="mb-3 font-medium">{technicalData.architecture_overview}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="bg-blue-500/10 p-3 rounded border border-blue-500/20">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Layers className="w-3 h-3 text-blue-400" />
                                        <span className="text-xs font-bold text-blue-400 uppercase">Recommended Stack</span>
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
                                        <Code className="w-3 h-3 text-blue-400" />
                                        <span className="text-xs font-bold text-blue-400 uppercase">Implementation Steps</span>
                                    </div>
                                    <ol className="text-xs space-y-1.5 list-decimal list-inside theme-text-secondary">
                                        {technicalData.implementation_steps?.map((step: string, idx: number) => (
                                            <li key={idx}>
                                                <span className="theme-text-primary">{step}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </div>

                            {technicalData.technical_risks?.length > 0 && (
                                <div className="mt-2 text-xs border border-orange-500/30 bg-orange-500/5 rounded p-2">
                                    <div className="font-bold text-orange-400 mb-1 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Technical Risks
                                    </div>
                                    <ul className="space-y-1 text-orange-300">
                                        {technicalData.technical_risks.map((risk: string, idx: number) => (
                                            <li key={idx}>• {risk}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t theme-border">
                                <span className="text-xs theme-text-secondary">Est. Complexity</span>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-24 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${technicalData.complexity_score > 7 ? 'bg-red-500' : technicalData.complexity_score > 4 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                            style={{ width: `${technicalData.complexity_score * 10}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold theme-text-primary">{technicalData.complexity_score}/10</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <label className="text-sm theme-text-secondary pl-1">Expected Benefit (KPI)</label>
                        <Button
                            type="button"
                            variant="secondary"
                            className="h-7 text-xs py-0 px-2 flex items-center gap-1 bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                            onClick={handleBusinessValueEnhancement}
                            disabled={enhancingBusinessValue}
                        >
                            {enhancingBusinessValue ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            Enhance Value
                        </Button>
                    </div>
                    <Input
                        placeholder="e.g. Reduce handle time by 20%"
                        value={formData.kpi}
                        onChange={e => handleChange('kpi', e.target.value)}
                        required
                    />
                    {businessValueData && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-3 p-4 rounded-lg border theme-border bg-green-500/5"
                        >
                            <div>
                                <h4 className="text-xs font-bold text-green-500 uppercase tracking-wider mb-2">Business Impact</h4>
                                <p className="text-sm theme-text-primary">{businessValueData.business_impact}</p>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-green-500 uppercase tracking-wider mb-2">Specific Metrics</h4>
                                <ul className="text-sm theme-text-secondary space-y-1">
                                    {businessValueData.specific_metrics?.map((metric: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                            {metric}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-green-500 uppercase tracking-wider mb-2">ROI Indicators</h4>
                                <ul className="text-sm theme-text-secondary space-y-1">
                                    {businessValueData.roi_indicators?.map((roi: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <Sparkles className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                            {roi}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {businessValueData.benchmarks?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-green-500 uppercase tracking-wider mb-2">Industry Benchmarks</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {businessValueData.benchmarks.map((benchmark: any, idx: number) => (
                                            <div key={idx} className="text-xs theme-bg-tertiary p-2 rounded">
                                                <span className="font-bold theme-text-primary">{benchmark.metric}:</span>{' '}
                                                <span className="text-green-500">{benchmark.value}</span>{' '}
                                                <span className="theme-text-secondary">({benchmark.source})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t theme-border">
                                <span className="text-xs theme-text-secondary">Confidence Score</span>
                                <span className="text-sm font-bold text-green-500">{(businessValueData.confidence_score * 100).toFixed(0)}%</span>
                            </div>

                            {businessValueData.is_mock && (
                                <div className="text-xs theme-text-secondary italic">⚠️ Mock mode - using sample data</div>
                            )}
                        </motion.div>
                    )}
                </div>

                <div className="pt-4">
                    <Button
                        type="submit"
                        className="w-full justify-center h-12 text-lg"
                        disabled={loading || !formData.title}
                    >
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
                            <p className="text-sm text-gray-300 mt-1">{duplicateData?.message}</p>
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
