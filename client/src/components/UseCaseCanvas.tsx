import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { api } from '../lib/api';
import { Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface UseCaseCanvasProps {
    session: any;
}

export function UseCaseCanvas({ session }: UseCaseCanvasProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

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

        try {
            await api.post('/usecases/', {
                ...formData,
                participant_id: session.participantId,
                workshop_id: session.workshopId
            });

            setSuccess(true);
            // Clear form (keeping category)
            setFormData(prev => ({
                title: '',
                description: '',
                proposed_solution: '',
                kpi: '',
                target_user: '',
                category: prev.category
            }));

        } catch (err) {
            console.error(err);
            alert("Failed to submit. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-surface-800/80 backdrop-blur border border-white/10 rounded-2xl p-6 shadow-xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-heading font-bold text-white">New Use Case</h2>
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
                            <label className="text-sm text-gray-400 pl-1">AI Technique</label>
                            <select
                                className="w-full bg-black/20 border-b-2 border-white/10 px-4 py-3 rounded-t-md text-white focus:outline-none focus:border-brand-violet transition-colors"
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
                        <label className="text-sm text-gray-400 pl-1">Problem Statement</label>
                        <textarea
                            className="w-full bg-black/20 border-b-2 border-white/10 px-4 py-3 rounded-t-md text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-violet transition-colors min-h-[100px]"
                            placeholder="What is the pain point?"
                            value={formData.description}
                            onChange={e => handleChange('description', e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400 pl-1">Proposed Solution</label>
                        <textarea
                            className="w-full bg-black/20 border-b-2 border-white/10 px-4 py-3 rounded-t-md text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-violet transition-colors min-h-[100px]"
                            placeholder="How does AI solve it?"
                            value={formData.proposed_solution}
                            onChange={e => handleChange('proposed_solution', e.target.value)}
                        />
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
        </div>
    );
}
