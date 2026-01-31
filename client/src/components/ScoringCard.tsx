import { useState } from 'react';
import { Button } from './ui/Button';
import { api } from '../lib/api';
import { awardPoints } from '../lib/api/gamification';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { PointsAnimation } from './gamification/PointsAnimation';

interface ScoringCardProps {
    session: any;
    activeCard: any;
    criteria: any[]; // [{name: 'Feasibility', weight: 50}, ...]
    templateId?: string;
}

export function ScoringCard({ session, activeCard, criteria, templateId }: ScoringCardProps) {
    const [scores, setScores] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [pointsEarned, setPointsEarned] = useState<number | null>(null);

    const is10Point = templateId === '7_POINT_COMPREHENSIVE';
    const minVal = is10Point ? 1 : 0;
    const maxVal = is10Point ? 10 : 100;
    const stepVal = is10Point ? 1 : 5;
    const defaultVal = is10Point ? 5 : 50;

    const handleScoreChange = (criterion: string, val: number) => {
        setScores(prev => ({ ...prev, [criterion]: val }));
    };

    const handleSubmit = async () => {
        if (!activeCard) return;
        setLoading(true);
        try {
            await api.post('/votes/', {
                use_case_id: activeCard.id,
                participant_id: session.participantId,
                scores: scores
            });
            
            // Award points for voting
            try {
                const allCriteriaScored = Object.keys(scores).length === criteria.length;
                const pointsResponse = await awardPoints(
                    session.participantId,
                    session.workshopId,
                    'vote',
                    {
                        use_case_id: activeCard.id,
                        consistency_bonus: allCriteriaScored
                    }
                );
                setPointsEarned(pointsResponse.points_earned);
            } catch (pointsError) {
                console.error('Failed to award points:', pointsError);
                // Don't fail the vote if points fail
            }
            
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

    if (!activeCard) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-surface-800 rounded-xl border border-white/10">
                <h3 className="text-xl font-bold mb-2 text-white">Waiting</h3>
                <p className="text-gray-400">Waiting for the facilitator to present a card...</p>
            </div>
        );
    }

    return (
        <>
            {pointsEarned !== null && (
                <PointsAnimation
                    points={pointsEarned}
                    onComplete={() => setPointsEarned(null)}
                />
            )}
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
                            <label className="text-sm font-medium flex items-center gap-2 group relative">
                                {c.name}
                                {c.description && (
                                    <span className="cursor-help text-gray-500 text-xs">(?)</span>
                                )}
                                {c.description && (
                                    <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-black/90 text-xs text-white rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        {c.description}
                                    </div>
                                )}
                            </label>
                            <span className="font-mono text-brand-magenta">{scores[c.name] ?? defaultVal}</span>
                        </div>
                        <input
                            type="range"
                            min={minVal}
                            max={maxVal}
                            step={stepVal}
                            className="w-full h-2 bg-surface-900 rounded-lg appearance-none cursor-pointer accent-brand-violet"
                            value={scores[c.name] ?? defaultVal}
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
        </>
    );
}
