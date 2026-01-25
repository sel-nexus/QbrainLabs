import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../../lib/socket';
import { ThumbsUp, ThumbsDown, Heart, Zap, AlertTriangle, HelpCircle, Lightbulb, Brain } from 'lucide-react';

interface ActiveReaction {
    id: string;
    type: string;
    x: number; // Random start X position
}

const ICONS: Record<string, any> = {
    '👍': ThumbsUp,
    '👎': ThumbsDown,
    '❤️': Heart,
    '🤔': Brain,
    '💡': Lightbulb,
    '🔥': Zap,
    '⚠️': AlertTriangle,
    '❓': HelpCircle,
};

const COLORS: Record<string, string> = {
    '👍': 'text-blue-400',
    '👎': 'text-blue-300',
    '❤️': 'text-red-400',
    '🤔': 'text-purple-400',
    '💡': 'text-yellow-400',
    '🔥': 'text-orange-400',
    '⚠️': 'text-yellow-500',
    '❓': 'text-purple-300',
};

export function ReactionOverlay() {
    const [reactions, setReactions] = useState<ActiveReaction[]>([]);

    useEffect(() => {
        const onReaction = (data: { reaction_type: string, participant_id?: string }) => {
            const id = Math.random().toString(36).substr(2, 9);
            const x = Math.random() * 80 + 10; // Random 10-90% width

            setReactions(prev => [...prev.slice(-30), { id, type: data.reaction_type, x }]);

            // Auto cleanup
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== id));
            }, 3000);
        };

        socket.on('reaction:sent', onReaction);
        return () => {
            socket.off('reaction:sent', onReaction);
        };
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            <AnimatePresence>
                {reactions.map(r => {
                    const Icon = ICONS[r.type] || Zap;
                    const color = COLORS[r.type] || 'text-white';

                    return (
                        <motion.div
                            key={r.id}
                            initial={{ bottom: -20, left: `${r.x}%`, opacity: 1, scale: 0.5 }}
                            animate={{
                                bottom: '60%',
                                opacity: 0,
                                scale: 1.5,
                                x: (Math.random() - 0.5) * 100 // Slight wobble
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 2.5, ease: "easeOut" }}
                            className={`absolute ${color}`}
                        >
                            <span className="text-4xl">{r.type}</span>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
