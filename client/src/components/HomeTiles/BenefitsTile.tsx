import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { Clock, Users, Sparkles, TrendingUp } from 'lucide-react';

const benefits = [
  {
    icon: Clock,
    stat: "75%",
    label: "Faster",
    desc: "Time for use case priority"
  },
  {
    icon: Users,
    stat: "25+",
    label: "Workshops",
    desc: "Successfully Executed"
  },
  {
    icon: Sparkles,
    stat: "AI",
    label: "Powered",
    desc: "Intelligent assistance"
  },
  {
    icon: TrendingUp,
    stat: "3x",
    label: "Better",
    desc: "Decision outcomes"
  }
];

export function BenefitsTile() {
  const { theme } = useTheme();

  return (
    <section 
      className={`relative w-full h-full flex items-center justify-center px-6 ${
        theme === 'light' ? 'bg-white' : 'bg-surface-900'
      }`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={`absolute bottom-0 left-0 w-[800px] h-[400px] ${
            theme === 'light' ? 'bg-brand-magenta/5' : 'bg-brand-magenta/10'
          } blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2`} 
        />
        <div 
          className={`absolute top-0 right-0 w-[600px] h-[300px] ${
            theme === 'light' ? 'bg-brand-violet/5' : 'bg-brand-violet/10'
          } blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2`} 
        />
      </div>

      <div className="max-w-5xl mx-auto w-full relative z-10">
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
            Why Teams Choose Us
          </h2>
          <p className={`text-lg max-w-2xl mx-auto ${
            theme === 'light' ? 'text-gray-600' : 'text-gray-400'
          }`}>
            Proven results from organizations that transformed their AI strategy
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {benefits.map((benefit, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={`text-center p-6 rounded-2xl ${
                theme === 'light' 
                  ? 'bg-gray-50 border border-gray-100' 
                  : 'bg-white/5 border border-white/5'
              }`}
            >
              <div className={`w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center ${
                theme === 'light' ? 'bg-brand-violet/10' : 'bg-brand-violet/20'
              }`}>
                <benefit.icon className="w-6 h-6 text-brand-violet" />
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-violet to-brand-magenta mb-1">
                {benefit.stat}
              </div>
              <div className={`font-semibold mb-1 ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}>
                {benefit.label}
              </div>
              <div className={`text-sm ${
                theme === 'light' ? 'text-gray-500' : 'text-gray-500'
              }`}>
                {benefit.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
