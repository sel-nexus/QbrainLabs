import { useState } from 'react';
import { Button } from './ui/Button';
import { api } from '../lib/api';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScoringCardProps {
    session: any;
    activeCard: any;
    criteria: any[]; // [{name: 'Feasibility', weight: 50}, ...]
}

export function ScoringCard({ session, activeCard, criteria }: ScoringCardProps) {
    const [scores, setScores] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleScoreChange = (criterion: string, val: number) => {
        setScores(prev => ({ ...prev, [criterion]: val }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post('/votes/', {
                use_case_id: activeCard.id,
                participant_id: session.participantId,
                scores: scores
            });
            setSubmitted(true);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Reset state when activeCard changes
    if (submitted && activeCard.id !== submitted) { // logic flaw check?
        // This simple logic might fail if component doesn't unmount or prop change check isn't strictly handled.
        // Better to rely on parent to reset activeCard prop triggering effect?
    }

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-surface-800 rounded-xl border border-white/10 animate-pulse">
                <div className="text-4xl mb-4">🙌</div>
                <h3 className="text-xl font-bold mb-2">Vote Recorded</h3>
                <p className="text-gray-400">Waiting for other participants...</p>
            </div>
        );
    }

    return (
        <motion.div
            key={activeCard.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-800/80 backdrop-blur border border-white/10 rounded-2xl p-6 shadow-xl max-w-lg mx-auto"
        >
            <div className="mb-6">
                <span className="text-xs text-brand-violet font-mono uppercase tracking-wider">Voting Now</span>
                <h2 className="text-2xl font-bold text-white mt-1 ">{activeCard.title}</h2>
                <p className="text-gray-300 mt-2 text-sm">{activeCard.description}</p>
                {activeCard.proposed_solution && (
                    <p className="text-gray-400 text-xs mt-2 bg-black/20 p-2 rounded">
                        <span className="font-bold">Solution:</span> {activeCard.proposed_solution}
                    </p>
                )}
            </div>

            <div className="space-y-6 mb-8">
                {criteria.map((c, idx) => (
                    <div key={idx}>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium">{c.name}</label>
                            <span className="font-mono text-brand-magenta">{scores[c.name] ?? 50}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            className="w-full h-2 bg-surface-900 rounded-lg appearance-none cursor-pointer accent-brand-violet"
                            value={scores[c.name] ?? 50}
                            onChange={(e) => handleScoreChange(c.name, Number(e.target.value))}
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Low</span>
                            <span>High</span>
                        </div>
                    </div>
                ))}
            </div>

            <Button className="w-full justify-center" onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Submit Vote'}
            </Button>
        </motion.div>
    );
}
