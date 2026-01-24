import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Presentation, Users, BrainCircuit, Zap, Target } from 'lucide-react';
import { motion } from 'framer-motion';

export function Landing() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-surface-900 text-white overflow-x-hidden">
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-brand-violet/20 blur-[120px] rounded-full" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto text-center relative z-10"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-brand-violet font-mono mb-8">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-magenta opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-magenta"></span>
                        </span>
                        <span>Now with AI-Powered Scoring</span>
                    </div>

                    <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
                        Map AI Use Cases <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-violet to-brand-magenta">
                            With Your Team
                        </span>
                    </h1>

                    <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        The collaborative platform for identifying, scoring, and prioritizing AI opportunities.
                        Turn brainstorming into a strategic roadmap in minutes.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <div onClick={() => navigate('/facilitator-login')} className="cursor-pointer group relative p-[1px] rounded-xl bg-gradient-to-r from-brand-violet to-brand-magenta">
                            <div className="bg-surface-900 rounded-[11px] px-8 py-4 h-full flex items-center gap-3 transition group-hover:bg-transparent">
                                <Presentation className="w-5 h-5" />
                                <span className="font-bold">Facilitator Login</span>
                            </div>
                        </div>

                        <Button
                            className="h-[58px] px-8 text-lg bg-white text-black hover:bg-gray-200"
                            onClick={() => navigate('/join')}
                        >
                            <Users className="mr-2 w-5 h-5" /> Join Session
                        </Button>
                    </div>
                </motion.div>
            </section>

            {/* Social Proof Removed */}


            {/* Features */}
            <section className="py-24 px-6 max-w-6xl mx-auto">
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: BrainCircuit,
                            title: "AI-Powered Intelligence",
                            desc: "Our RAG engine helps refine use cases and check technical feasibility in real-time."
                        },
                        {
                            icon: Zap,
                            title: "Real-Time Collaboration",
                            desc: "Vote, score, and discuss ideas synchronously. See results update live on the matrix."
                        },
                        {
                            icon: Target,
                            title: "Strategic Prioritization",
                            desc: "Automatically map opportunities to a Value vs. Feasibility matrix to find quick wins."
                        }
                    ].map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-surface-800/50 p-8 rounded-2xl border border-white/5 hover:border-brand-violet/50 transition-colors"
                        >
                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 text-brand-violet">
                                <feature.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                            <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* How it Works */}
            <section className="py-24 bg-surface-800/30 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-16">How It Works</h2>
                    <div className="grid md:grid-cols-3 gap-12 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-brand-violet/30 to-transparent" />

                        {[
                            { step: "01", title: "Create", desc: "Define your criteria and launch a secure workspace." },
                            { step: "02", title: "Collaborate", desc: "Team submits ideas and AI helps refine them." },
                            { step: "03", title: "Synthesize", desc: "Vote on value/feasibility and export the roadmap." }
                        ].map((item, i) => (
                            <div key={i} className="relative z-10">
                                <div className="w-24 h-24 mx-auto bg-surface-900 border-2 border-brand-violet rounded-full flex items-center justify-center text-2xl font-bold mb-6 font-mono shadow-glow">
                                    {item.step}
                                </div>
                                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                                <p className="text-gray-400 text-sm">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <footer className="py-8 text-center text-gray-600 text-sm border-t border-white/5">
                <p>&copy; 2026 AI Hotspot Matrix. All Rights Reserved.</p>
            </footer>
        </div>
    );
}
