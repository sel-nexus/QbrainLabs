import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Criterion {
    name: string;
    weight: number;
}

export function CreateWorkshop() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [criteria, setCriteria] = useState<Criterion[]>([
        { name: 'Feasibility', weight: 50 },
        { name: 'Business Value', weight: 50 },
    ]);

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
                config: { criteria }
            });
            // Navigate to dashboard or workshop lobby using the created ID
            // For now, let's just go back to dashboard
            navigate('/dashboard');
        } catch (error) {
            console.error("Failed to create workshop", error);
            alert("Failed to create workshop. Check console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-6 max-w-2xl mx-auto">
            <Button variant="ghost" className="mb-6 pl-0" onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface-800/60 backdrop-blur-md border border-white/10 p-8 rounded-2xl shadow-xl"
            >
                <h1 className="text-3xl font-heading font-bold text-white mb-2">Create New Workshop</h1>
                <p className="text-gray-400 mb-8">Configure your AI strategy session.</p>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <Input
                        label="Workshop Title"
                        placeholder="e.g. Q1 AI Roadmap"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm text-gray-400 font-medium">Scoring Criteria</label>
                            <span className={`text-sm font-mono ${totalWeight === 100 ? 'text-semantic-success' : 'text-semantic-warning'}`}>
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
                            <p className="text-center text-sm text-semantic-warning mt-3">
                                Total weight must equal 100% (Currently {totalWeight}%)
                            </p>
                        )}
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
