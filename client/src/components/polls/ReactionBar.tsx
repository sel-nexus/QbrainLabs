import React from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Heart, Zap, AlertTriangle, HelpCircle, Lightbulb, Brain } from 'lucide-react';
import { PollService } from '../../lib/api/polls';
import { useSession } from '../../context/SessionContext';

const REACTIONS = [
    { type: '👍', icon: ThumbsUp, color: 'text-blue-400', label: 'Agree' },
    { type: '👎', icon: ThumbsDown, color: 'text-blue-300', label: 'Disagree' },
    { type: '❤️', icon: Heart, color: 'text-red-400', label: 'Love' },
    { type: '🤔', icon: Brain, color: 'text-purple-400', label: 'Thinking' },
    { type: '💡', icon: Lightbulb, color: 'text-yellow-400', label: 'Insight' },
    { type: '🔥', icon: Zap, color: 'text-orange-400', label: 'Exciting' },
    { type: '⚠️', icon: AlertTriangle, color: 'text-yellow-500', label: 'Concern' },
    { type: '❓', icon: HelpCircle, color: 'text-purple-300', label: 'Question' },
];

export function ReactionBar() {
    const { session } = useSession();

    const handleReact = async (type: string) => {
        if (!session?.workshopId || !session?.participantId) return;
        try {
            await PollService.sendReaction(session.workshopId, session.participantId, type);
            // We rely on socket broadcast to show the animation effectively, 
            // or we could optimistically trigger a local animation.
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-900/90 backdrop-blur border border-white/10 rounded-full px-2 py-2 shadow-xl z-50 flex gap-1 items-center">
            {REACTIONS.map((r) => (
                <motion.button
                    key={r.type}
                    whileHover={{ scale: 1.2, y: -5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleReact(r.type)}
                    className={`p-2 rounded-full hover:bg-white/10 transition-colors ${r.color} relative group`}
                    title={r.label}
                >
                    <span className="text-xl">{r.type}</span>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                        {r.label}
                    </span>
                </motion.button>
            ))}
        </div>
    );
}
