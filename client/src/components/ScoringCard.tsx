import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { api } from '../lib/api';
import { awardPoints } from '../lib/api/gamification';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { PointsAnimation } from './gamification/PointsAnimation';
import { toast } from 'sonner';
import { errorMessage } from '../lib/apiErrors';

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

    // Load existing scores for this card if any
    useEffect(() => {
        if (!activeCard || !session?.participantId) return;

        const loadExistingVote = async () => {
            try {
                const { data } = await api.get(`votes/participant/${session.participantId}/matrix-positions?workshop_id=${session.workshopId}`);
                const existingVote = data.find((v: any) => v.id === activeCard.id);
                if (existingVote && existingVote.scores) {
                    setScores(existingVote.scores);
                } else {
                    setScores({});
                }
            } catch (err) {
                console.error('Failed to load existing vote:', err);
            }
        };

        loadExistingVote();
    }, [activeCard?.id, session?.participantId, session?.workshopId]);

    // What the participant sees is what gets saved: untouched sliders submit
    // the value they display (the default) rather than being left out.
    const displayedScores = (): Record<string, number> =>
        Object.fromEntries(criteria.map((c) => [c.name, scores[c.name] ?? defaultVal]));

    const handleSubmit = async () => {
        if (!activeCard) return;
        setLoading(true);
        const finalScores = displayedScores();
        try {
            await api.post('votes/', {
                use_case_id: activeCard.id,
                participant_id: session.participantId,
                scores: finalScores
            });
            setScores(finalScores);

            // Award points for voting
            try {
                const allCriteriaScored = Object.keys(finalScores).length === criteria.length;
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
            toast.error(errorMessage(e, 'Your score was not saved.') + ' Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // (The parent keys this component by card id, so state resets per card.)
    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-surface-800 rounded-xl border border-white/10" role="status">
                <div className="text-4xl mb-4" aria-hidden="true">🙌</div>
                <h3 className="text-xl font-bold mb-2">Score recorded</h3>
                <p className="text-gray-400 mb-4">Waiting for other participants...</p>
                <Button variant="secondary" onClick={() => setSubmitted(false)}>
                    Change my score
                </Button>
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
                    <span className="text-xs text-brand-violet font-mono uppercase tracking-wider">
                        Now scoring{activeCard.position && activeCard.total ? ` · Card ${activeCard.position} of ${activeCard.total}` : ''}
                    </span>
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
                            <div className="flex justify-between mb-1">
                                <label htmlFor={`score-${idx}`} className="text-sm font-medium">
                                    {c.name}
                                </label>
                                <span className="font-mono text-brand-magenta" aria-hidden="true">{scores[c.name] ?? defaultVal}</span>
                            </div>
                            {/* Shown inline (not hover-only) so phone users can read it */}
                            {c.description && (
                                <p id={`score-${idx}-desc`} className="text-xs text-gray-400 mb-2">{c.description}</p>
                            )}
                            <input
                                id={`score-${idx}`}
                                aria-describedby={c.description ? `score-${idx}-desc` : undefined}
                                type="range"
                                min={minVal}
                                max={maxVal}
                                step={stepVal}
                                className="w-full h-2 bg-surface-900 rounded-lg appearance-none cursor-pointer accent-brand-violet"
                                value={scores[c.name] ?? defaultVal}
                                onChange={(e) => handleScoreChange(c.name, Number(e.target.value))}
                            />
                            {/* Same anchors as the prioritization matrix: low on the left, high on the right */}
                            <div className="flex justify-between text-xs text-gray-500 mt-1" aria-hidden="true">
                                <span>{minVal} · Low</span>
                                <span>{maxVal} · High</span>
                            </div>
                        </div>
                    ))}
                </div>

                <Button className="w-full justify-center" onClick={handleSubmit} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : 'Submit score'}
                </Button>
            </motion.div>
        </>
    );
}
