import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { ArrowRight, Sparkles } from 'lucide-react';

export function CTATile() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <section 
      className={`relative w-full h-full flex flex-col items-center justify-center px-6 ${
        theme === 'light' ? 'bg-gray-50' : 'bg-surface-800/50'
      }`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] ${
            theme === 'light' ? 'bg-brand-violet/5' : 'bg-brand-violet/15'
          } blur-[150px] rounded-full`} 
        />
      </div>

      <div className="max-w-3xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 ${
            theme === 'light' ? 'bg-brand-violet/10' : 'bg-brand-violet/20'
          }`}>
            <Sparkles className="w-8 h-8 text-brand-violet" />
          </div>
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-6 ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}
        >
          {t('landing.cta.title')}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-violet to-brand-magenta">
            {t('landing.cta.titleHighlight')}
          </span>
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className={`text-lg sm:text-xl mb-10 max-w-xl mx-auto ${
            theme === 'light' ? 'text-gray-600' : 'text-gray-400'
          }`}
        >
          {t('landing.cta.subtitle')}
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Button
            onClick={() => navigate('/facilitator-login')}
            className="group h-14 px-8 text-lg bg-gradient-to-r from-brand-violet to-brand-magenta hover:brightness-110"
          >
            {t('landing.cta.getStarted')}
            <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate('/join')}
            className={`h-14 px-8 text-lg ${
              theme === 'light' 
                ? 'border-gray-300 text-gray-700 hover:bg-gray-100' 
                : 'border-white/20 text-white hover:bg-white/10'
            }`}
          >
            {t('landing.cta.joinSession')}
          </Button>
        </motion.div>
      </div>

      <motion.footer 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className={`absolute bottom-6 left-0 right-0 text-center text-sm ${
          theme === 'light' ? 'text-gray-500' : 'text-gray-600'
        }`}
      >
        <p>{t('landing.cta.copyright')}</p>
      </motion.footer>
    </section>
  );
}
