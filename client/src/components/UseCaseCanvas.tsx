import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { api } from '../lib/api';
import { awardPoints } from '../lib/api/gamification';
import { socket } from '../lib/socket';
import { Loader2, Check, Sparkles, AlertTriangle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Modal } from './ui/Modal';
import { PointsAnimation } from './gamification/PointsAnimation';
import { useTheme } from '../context/ThemeContext';

interface UseCaseCanvasProps {
    session: any;
    onSuccess?: () => void;
}

export function UseCaseCanvas({ session, onSuccess }: UseCaseCanvasProps) {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [enhancing, setEnhancing] = useState(false);
    const [checkingFeasibility, setCheckingFeasibility] = useState(false);
    const [feasibilityData, setFeasibilityData] = useState<{ score: string, reason: string } | null>(null);
    const [duplicateData, setDuplicateData] = useState<any>(null);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [pointsEarned, setPointsEarned] = useState<number | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '', // Problem
        proposed_solution: '',
        kpi: '',
        target_user: '',
        category: 'Generative AI'
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setSuccess(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // 1. Check Duplicates
        try {
            const { data } = await api.post('/ai/duplicates', {
                workshop_id: session.workshopId,
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
        await submitUseCase();
    };

    const submitUseCase = async () => {
        setLoading(true);
        try {
            await api.post('/usecases/', {
                ...formData,
                participant_id: session.participantId,
                workshop_id: session.workshopId
            });

            // Award points for submitting use case
            try {
                const pointsResponse = await awardPoints(
                    session.participantId,
                    session.workshopId,
                    'submit_use_case',
                    { use_case_title: formData.title }
                );
                setPointsEarned(pointsResponse.points_earned);
                
                // Check if first to submit (bonus points)
                // This would ideally come from the backend, but for now we'll just award base points
                if (pointsResponse.achievements_unlocked.length > 0) {
                    toast.success(`Badge unlocked: ${pointsResponse.achievements_unlocked.join(', ')}!`);
                }
            } catch (pointsError) {
                console.error('Failed to award points:', pointsError);
                // Don't fail the submission if points fail
            }

            setSuccess(true);
            setFormData(prev => ({
                title: '',
                description: '',
                proposed_solution: '',
                kpi: '',
                target_user: '',
                category: prev.category
            }));
            setShowDuplicateModal(false);

            // Call onSuccess callback if provided (e.g., to close modal)
            if (onSuccess) {
                // Small delay to show success message
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            }

        } catch (err) {
            console.error(err);
            toast.error("Failed to submit. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleEnhance = async () => {
        if (!formData.description) {
            toast.error("Please enter a Problem Statement first.");
            return;
        }
        setEnhancing(true);
        try {
            const { data } = await api.post('/ai/enhance', { text: formData.description + " " + formData.proposed_solution });

            // Allow user to see what happened via toast
            toast.success("AI Enhanced the content!");

            setFormData(prev => ({
                ...prev,
                title: data.refined_title || prev.title || data.title,
                description: data.refined_description || prev.description || data.description,
                proposed_solution: data.suggested_solution || prev.proposed_solution || data.solution,
                kpi: data.kpi || prev.kpi
            }));
        } catch (e) {
            console.error(e);
            toast.error("AI Enhancement failed.");
        } finally {
            setEnhancing(false);
        }
    };

    const handleFeasibility = async () => {
        if (!formData.proposed_solution) {
            toast.error("Please enter a Proposed Solution first.");
            return;
        }
        setCheckingFeasibility(true);
        try {
            const { data } = await api.post('/ai/feasibility', { solution: formData.proposed_solution });
            setFeasibilityData({ score: data.score, reason: data.reason });
        } catch (e) {
            toast.error("Feasibility check failed.");
        } finally {
            setCheckingFeasibility(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            {pointsEarned !== null && (
                <PointsAnimation
                    points={pointsEarned}
                    onComplete={() => setPointsEarned(null)}
                />
            )}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="theme-bg-primary theme-border border rounded-2xl p-6 shadow-xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-heading font-bold theme-text-primary">New Use Case</h2>
                    <span className="bg-brand-violet/20 text-brand-violet px-3 py-1 rounded-full text-sm font-mono">
                        Drafting Node
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
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
                    </div>

                    <Input
                        label="Expected Benefit (KPI)"
                        placeholder="e.g. Reduce handle time by 20%"
                        value={formData.kpi}
                        onChange={e => handleChange('kpi', e.target.value)}
                        required
                    />

                    <div className="pt-4">
                        <Button
                            type="submit"
                            className="w-full justify-center h-12 text-lg"
                            disabled={loading || !formData.title}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Submit to Matrix'}
                        </Button>

                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-3 bg-semantic-success/20 text-semantic-success rounded-lg text-center flex items-center justify-center gap-2"
                            >
                                <Check className="w-5 h-5" /> Submitted successfully! Add another?
                            </motion.div>
                        )}
                    </div>
                </form>
            </motion.div>

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
                            onClick={submitUseCase}
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
