import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'contrast' : 'light'} mode`}
      className={`relative p-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-violet/50 ${
        theme === 'light'
          ? 'bg-gray-100 border-gray-200 hover:bg-gray-200 hover:border-gray-300'
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
      }`}
      title={`Current: ${theme === 'light' ? 'Light' : 'Contrast'} Mode`}
    >
      <motion.div
        initial={false}
        animate={{ rotate: theme === 'light' ? 0 : 180, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        {theme === 'light' ? (
          <Sun className="w-5 h-5 text-amber-500" />
        ) : (
          <Moon className="w-5 h-5 text-brand-violet" />
        )}
      </motion.div>
    </button>
  );
}
