import { useState } from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Heart, Zap, AlertTriangle, HelpCircle, Lightbulb, Brain, Smile, X } from 'lucide-react';
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

    // Collapsed to one floating button so it never covers the form or matrix.
    const [open, setOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-4 z-40 flex items-center gap-2">
            {open && (
                <div role="group" aria-label="Send a reaction" className="theme-bg-secondary backdrop-blur border theme-border rounded-full px-2 py-1.5 shadow-xl flex flex-wrap gap-1 items-center max-w-[calc(100vw-6rem)]">
                    {REACTIONS.map((r) => (
                        <motion.button
                            key={r.type}
                            type="button"
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                handleReact(r.type);
                                setOpen(false);
                            }}
                            className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 ${r.color}`}
                            aria-label={r.label}
                            title={r.label}
                        >
                            <span className="text-xl" aria-hidden="true">{r.type}</span>
                        </motion.button>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label={open ? 'Close reactions' : 'React'}
                className="w-12 h-12 rounded-full bg-brand-violet text-white shadow-xl flex items-center justify-center"
            >
                {open ? <X className="w-5 h-5" aria-hidden="true" /> : <Smile className="w-5 h-5" aria-hidden="true" />}
            </button>
        </div>
    );
}
