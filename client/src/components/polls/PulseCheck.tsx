import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { PollService } from '../../lib/api/polls';
import { useSession } from '../../context/SessionContext';
import { socket } from '../../lib/socket';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Gauge, Zap } from 'lucide-react';

type PulseCheckType = 'UNDERSTANDING' | 'PACE' | 'ENERGY' | 'CONFIDENCE';

interface PulseCheckProps {
    type: PulseCheckType;
    onComplete?: () => void;
}

const PULSE_CHECK_CONFIG: Record<PulseCheckType, { question: string; options: string[] }> = {
    UNDERSTANDING: {
        question: 'How well do you understand this?',
        options: ['Got it', 'Need review']
    },
    PACE: {
        question: 'How is the pace?',
        options: ['Too fast', 'Just right', 'Too slow']
    },
    ENERGY: {
        question: 'How is your energy level?',
        options: ['Energized', 'Neutral', 'Tired']
    },
    CONFIDENCE: {
        question: 'How confident are you?',
        options: ['1', '2', '3', '4', '5']
    }
};

export function PulseCheck({ type, onComplete }: PulseCheckProps) {
    const { session } = useSession();
    const [selected, setSelected] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const config = PULSE_CHECK_CONFIG[type];

    const handleSubmit = async () => {
        if (!selected || !session?.workshopId || !session?.participantId) return;

        try {
            // Create a quick poll for pulse check
            await PollService.createPoll(session.workshopId, {
                question_text: config.question,
                poll_type: 'MULTIPLE_CHOICE',
                options: config.options,
                is_anonymous: true
            });

            // Vote immediately
            const polls = await PollService.getPolls(session.workshopId, session.participantId);
            const latestPoll = polls[0];
            if (latestPoll) {
                await PollService.vote(latestPoll.id, session.participantId, selected);
            }

            setSubmitted(true);
            toast.success('Pulse check submitted');
            setTimeout(() => {
                setSubmitted(false);
                setSelected(null);
                onComplete?.();
            }, 2000);
        } catch (err) {
            toast.error('Failed to submit pulse check');
        }
    };

    if (submitted) {
        return (
            <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-green-400">Thank you for your feedback!</p>
            </div>
        );
    }

    return (
        <div className="bg-surface-800 border border-primary-500/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
                <Gauge className="w-5 h-5 text-primary-400" />
                <h4 className="font-bold">{config.question}</h4>
            </div>
            <div className="space-y-2">
                {config.options.map((option, idx) => (
                    <button
                        key={idx}
                        onClick={() => setSelected(option)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                            selected === option
                                ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                                : 'bg-surface-700 border-white/5 hover:border-white/20'
                        }`}
                    >
                        {option}
                    </button>
                ))}
            </div>
            <Button
                onClick={handleSubmit}
                disabled={!selected}
                className="w-full mt-4"
            >
                Submit
            </Button>
        </div>
    );
}
