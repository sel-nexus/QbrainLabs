import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface PointsAnimationProps {
    points: number;
    onComplete?: () => void;
}

export function PointsAnimation({ points, onComplete }: PointsAnimationProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            onComplete?.();
        }, 2000);

        return () => clearTimeout(timer);
    }, [points, onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: 1, y: -50, scale: 1 }}
                    exit={{ opacity: 0, y: -100, scale: 0.5 }}
                    transition={{ duration: 0.5 }}
                    className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
                >
                    <div className="bg-yellow-500/90 text-black px-6 py-3 rounded-full shadow-2xl font-bold text-2xl flex items-center gap-2">
                        <span>+{points}</span>
                        <span className="text-xl">🪙</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
