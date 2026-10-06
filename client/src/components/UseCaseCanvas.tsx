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
    onDirtyChange?: (dirty: boolean) => void;
}

const useCaseDraftKey = (session: { workshopId: string; participantId: string }) =>
    `hm_uc_draft:${session.workshopId}:${session.participantId}`;

export function UseCaseCanvas({ session, onSuccess, onDirtyChange }: UseCaseCanvasProps) {
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

        // Show confirmation and close modal
        toast.success('Use case submitted successfully!');
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
                    <h2 className="text-2xl font-heading font-bold theme-text-primary">New use case</h2>
                </div>

                <UseCaseForm
                    workshopId={session.workshopId}
                    onSubmit={handleSubmit}
                    draftKey={useCaseDraftKey(session)}
                    onDirtyChange={onDirtyChange}
                />
            </motion.div>
        </div>
    );
}
