import { useState } from 'react';
import { UseCaseForm, type UseCaseData } from './UseCaseForm';
import { api } from '../lib/api';
import { awardPoints } from '../lib/api/gamification';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { PointsAnimation } from './gamification/PointsAnimation';

interface UseCaseCanvasProps {
    session: any;
    onSuccess?: () => void;
}

export function UseCaseCanvas({ session, onSuccess }: UseCaseCanvasProps) {
    const [pointsEarned, setPointsEarned] = useState<number | null>(null);

    const handleSubmit = async (data: UseCaseData) => {
        // Proceed with submission (Duplicate check already handled by UseCaseForm)
        await api.post('usecases/', {
            ...data,
            participant_id: session.participantId,
            workshop_id: session.workshopId
        });

        // Award points
        try {
            const pointsResponse = await awardPoints(
                session.participantId,
                session.workshopId,
                'submit_use_case',
                { use_case_title: data.title }
            );
            setPointsEarned(pointsResponse.points_earned);
            if (pointsResponse.achievements_unlocked.length > 0) {
                toast.success(`Badge unlocked: ${pointsResponse.achievements_unlocked.join(', ')}!`);
            }
        } catch (pointsError) {
            console.error('Failed to award points:', pointsError);
        }

        // Parent onSuccess call handles closing modal etc if needed
        if (onSuccess) {
            setTimeout(() => onSuccess(), 1500);
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

                <UseCaseForm
                    workshopId={session.workshopId}
                    onSubmit={handleSubmit}
                />
            </motion.div>
        </div>
    );
}
