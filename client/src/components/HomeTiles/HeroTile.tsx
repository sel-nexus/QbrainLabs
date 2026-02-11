import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Presentation, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export function HeroTile() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <section
      className={`relative w-full h-full flex items-center justify-center px-6 py-12 ${theme === 'light' ? 'bg-white' : 'bg-surface-900'
        }`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] ${theme === 'light' ? 'bg-brand-violet/10' : 'bg-brand-violet/20'
            } blur-[150px] rounded-full`}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="max-w-4xl mx-auto text-center relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${theme === 'light'
              ? 'bg-gray-100 border border-gray-200'
              : 'bg-white/5 border border-white/10'
            } text-sm text-brand-violet font-mono mb-4 sm:mb-8`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-magenta opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-magenta" />
          </span>
          <span>{t('landing.hero.badge')}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className={`text-3xl sm:text-6xl md:text-7xl font-bold mb-3 sm:mb-6 tracking-tight leading-tight ${theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}
        >
          {t('landing.hero.title')} <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-violet to-brand-magenta">
            {t('landing.hero.titleHighlight')}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className={`text-base sm:text-xl ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'
            } mb-5 sm:mb-10 max-w-2xl mx-auto leading-relaxed`}
        >
          {t('landing.hero.subtitle')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <div
            onClick={() => navigate('/facilitator-login')}
            className="cursor-pointer group relative p-[1px] rounded-xl bg-gradient-to-r from-brand-violet to-brand-magenta w-full sm:w-auto"
          >
            <div className={`${theme === 'light' ? 'bg-white' : 'bg-surface-900'
              } rounded-[11px] px-6 py-3 sm:px-8 sm:py-4 h-full flex items-center justify-center gap-3 transition group-hover:bg-transparent`}>
              <Presentation className="w-5 h-5" />
              <span className="font-bold">{t('landing.hero.facilitatorLogin')}</span>
            </div>
          </div>

          <Button
            className={`h-[58px] px-6 sm:px-8 text-lg w-full sm:w-auto ${theme === 'light'
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-white text-black hover:bg-gray-200'
              }`}
            onClick={() => navigate('/join')}
          >
            <Users className="mr-2 w-5 h-5" /> {t('landing.hero.joinSession')}
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
