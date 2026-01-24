import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

const steps = [
  { 
    step: "01", 
    title: "Create", 
    desc: "Define your criteria and launch a secure workspace for your team." 
  },
  { 
    step: "02", 
    title: "Collaborate", 
    desc: "Team submits ideas and AI helps refine and validate them in real-time." 
  },
  { 
    step: "03", 
    title: "Synthesize", 
    desc: "Vote on value and feasibility, then export your prioritized roadmap." 
  }
];

export function HowItWorksTile() {
  const { theme } = useTheme();

  return (
    <section 
      className={`relative w-full h-full flex items-center justify-center px-6 ${
        theme === 'light' ? 'bg-gray-50' : 'bg-surface-800/30'
      }`}
    >
      <div className="max-w-4xl mx-auto text-center w-full">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={`text-3xl sm:text-4xl font-bold mb-16 ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}
        >
          How It Works
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
          <div className={`hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 ${
            theme === 'light' 
              ? 'bg-gradient-to-r from-transparent via-brand-violet/30 to-transparent' 
              : 'bg-gradient-to-r from-transparent via-brand-violet/30 to-transparent'
          }`} />

          {steps.map((item, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, duration: 0.5 }}
              className="relative z-10"
            >
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 + 0.1, duration: 0.4 }}
                className={`w-24 h-24 mx-auto ${
                  theme === 'light' ? 'bg-white' : 'bg-surface-900'
                } border-2 border-brand-violet rounded-full flex items-center justify-center text-2xl font-bold mb-6 font-mono shadow-glow`}
              >
                {item.step}
              </motion.div>
              <h3 className={`text-xl font-bold mb-3 ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}>
                {item.title}
              </h3>
              <p className={`${
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              } text-sm leading-relaxed max-w-xs mx-auto`}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
