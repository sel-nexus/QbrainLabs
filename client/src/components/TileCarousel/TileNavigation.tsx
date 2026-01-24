import { useTheme } from '../../context/ThemeContext';
import { Pause, Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface TileNavigationProps {
  totalTiles: number;
  currentTile: number;
  onTileSelect: (index: number) => void;
  progress: number;
  isAutoPlaying: boolean;
  onToggleAutoPlay: () => void;
}

export function TileNavigation({
  totalTiles,
  currentTile,
  onTileSelect,
  progress,
  isAutoPlaying,
  onToggleAutoPlay,
}: TileNavigationProps) {
  const { theme } = useTheme();

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-3">
      {Array.from({ length: totalTiles }).map((_, index) => (
        <button
          key={index}
          onClick={() => onTileSelect(index)}
          className={`relative w-3 h-3 rounded-full transition-all duration-300 ${
            currentTile === index
              ? 'scale-125'
              : theme === 'light'
              ? 'bg-gray-300 hover:bg-gray-400'
              : 'bg-white/30 hover:bg-white/50'
          }`}
          aria-label={`Go to slide ${index + 1}`}
          aria-current={currentTile === index ? 'true' : undefined}
        >
          {currentTile === index && (
            <>
              <span
                className={`absolute inset-0 rounded-full ${
                  theme === 'light' ? 'bg-brand-violet' : 'bg-white'
                }`}
              />
              {isAutoPlaying && (
                <svg
                  className="absolute -inset-1 w-5 h-5"
                  viewBox="0 0 20 20"
                >
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    fill="none"
                    stroke={theme === 'light' ? '#7c3aed' : 'rgba(255,255,255,0.3)'}
                    strokeWidth="2"
                  />
                  <motion.circle
                    cx="10"
                    cy="10"
                    r="8"
                    fill="none"
                    stroke={theme === 'light' ? '#7c3aed' : '#ffffff'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={50.27}
                    strokeDashoffset={50.27 - (50.27 * progress) / 100}
                    transform="rotate(-90 10 10)"
                  />
                </svg>
              )}
            </>
          )}
        </button>
      ))}

      <button
        onClick={onToggleAutoPlay}
        className={`mt-4 p-2 rounded-full transition-all duration-200 ${
          theme === 'light'
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            : 'bg-white/10 hover:bg-white/20 text-white/70'
        }`}
        aria-label={isAutoPlaying ? 'Pause auto-play' : 'Resume auto-play'}
      >
        {isAutoPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>

      <div
        className={`text-xs font-mono ${
          theme === 'light' ? 'text-gray-500' : 'text-white/50'
        }`}
      >
        {currentTile + 1}/{totalTiles}
      </div>
    </div>
  );
}
