import { BrainCircuit, Zap, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

const features = [
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
];

export function FeaturesTile() {
  const { theme } = useTheme();

  return (
    <section 
      className={`relative w-full h-full flex items-center justify-center px-6 ${
        theme === 'light' ? 'bg-white' : 'bg-surface-900'
      }`}
    >
      <div className="max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}>
            Powerful Features
          </h2>
          <p className={`text-lg max-w-2xl mx-auto ${
            theme === 'light' ? 'text-gray-600' : 'text-gray-400'
          }`}>
            Everything you need to run successful AI prioritization workshops
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className={`${
                theme === 'light' 
                  ? 'bg-gray-50 border-gray-200 hover:border-brand-violet/50 hover:shadow-lg' 
                  : 'bg-surface-800/50 border-white/5 hover:border-brand-violet/50'
              } p-8 rounded-2xl border transition-all duration-300`}
            >
              <div className={`w-14 h-14 ${
                theme === 'light' ? 'bg-brand-violet/10' : 'bg-white/5'
              } rounded-xl flex items-center justify-center mb-6 text-brand-violet`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}>
                {feature.title}
              </h3>
              <p className={`${
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              } leading-relaxed`}>
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
