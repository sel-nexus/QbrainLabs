import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'contrast' : 'light'} mode`}
      className="relative p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-violet/50"
      title={`Current: ${theme === 'light' ? 'Light' : 'Contrast'} Mode`}
    >
      <motion.div
        initial={false}
        animate={{ rotate: theme === 'light' ? 0 : 180, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        {theme === 'light' ? (
          <Sun className="w-5 h-5 text-amber-400" />
        ) : (
          <Moon className="w-5 h-5 text-brand-violet" />
        )}
      </motion.div>
    </button>
  );
}
