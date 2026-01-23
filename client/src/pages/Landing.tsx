import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Presentation, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export function Landing() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-surface-900 to-black">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-xl"
            >
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-brand-violet to-brand-magenta animate-pulse shadow-glow" />
                <h1 className="text-5xl font-heading font-bold text-white mb-4 tracking-tight">
                    Hotspot Matrix
                </h1>
                <p className="text-xl text-gray-400 mb-12">
                    Collaborative AI strategy prioritization for teams.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                        className="h-14 text-lg px-8"
                        onClick={() => navigate('/join')}
                    >
                        <Users className="mr-2 w-5 h-5" /> Join Session
                    </Button>
                    <Button
                        variant="secondary"
                        className="h-14 text-lg px-8"
                        onClick={() => navigate('/dashboard')}
                    >
                        <Presentation className="mr-2 w-5 h-5" /> Facilitator Login
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
