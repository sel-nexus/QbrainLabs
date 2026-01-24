import { useRef, useEffect, type ReactNode } from 'react';
import { useTileCarousel } from '../../hooks/useTileCarousel';
import { TileNavigation } from './TileNavigation';
import { useTheme } from '../../context/ThemeContext';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TileCarouselProps {
  children: ReactNode[];
  autoPlayInterval?: number;
  showNavigation?: boolean;
  showScrollHint?: boolean;
  loop?: boolean;
}

export function TileCarousel({
  children,
  autoPlayInterval = 6000,
  showNavigation = true,
  showScrollHint = true,
  loop = true,
}: TileCarouselProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalTiles = children.length;
  
  const {
    currentTile,
    goToTile,
    nextTile,
    prevTile,
    pauseAutoPlay,
    isAutoPlaying,
    isPaused,
    setIsAutoPlaying,
    progress,
  } = useTileCarousel({
    totalTiles,
    autoPlayInterval,
    loop,
  });

  useEffect(() => {
    if (containerRef.current && !isScrollingRef.current) {
      const tileHeight = containerRef.current.clientHeight;
      containerRef.current.scrollTo({
        top: currentTile * tileHeight,
        behavior: 'smooth',
      });
    }
  }, [currentTile]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      isScrollingRef.current = true;
      pauseAutoPlay();

      scrollTimeoutRef.current = setTimeout(() => {
        const scrollTop = container.scrollTop;
        const tileHeight = container.clientHeight;
        const newTile = Math.round(scrollTop / tileHeight);
        
        if (newTile !== currentTile && newTile >= 0 && newTile < totalTiles) {
          goToTile(newTile);
        }
        
        isScrollingRef.current = false;
      }, 100);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [currentTile, totalTiles, goToTile, pauseAutoPlay]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          nextTile();
          pauseAutoPlay();
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          prevTile();
          pauseAutoPlay();
          break;
        case 'Home':
          e.preventDefault();
          goToTile(0);
          pauseAutoPlay();
          break;
        case 'End':
          e.preventDefault();
          goToTile(totalTiles - 1);
          pauseAutoPlay();
          break;
        case ' ':
          e.preventDefault();
          setIsAutoPlaying(!isAutoPlaying);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextTile, prevTile, goToTile, totalTiles, pauseAutoPlay, isAutoPlaying, setIsAutoPlaying]);

  const handleWheel = () => {
    pauseAutoPlay();
  };

  return (
    <div className="relative h-full overflow-hidden">
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
        onWheel={handleWheel}
        tabIndex={0}
        role="region"
        aria-label="Tile carousel"
      >
        {children.map((child: ReactNode, index: number) => (
          <div
            key={index}
            className={`h-full w-full snap-start snap-always flex items-center justify-center flex-shrink-0 border-b ${
              theme === 'light' ? 'border-gray-200' : 'border-white/10'
            }`}
            style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
            aria-label={`Slide ${index + 1} of ${totalTiles}`}
          >
            {child}
          </div>
        ))}
      </div>

      {showNavigation && (
        <TileNavigation
          totalTiles={totalTiles}
          currentTile={currentTile}
          onTileSelect={(index: number) => {
            goToTile(index);
            pauseAutoPlay();
          }}
          progress={progress}
          isAutoPlaying={isAutoPlaying && !isPaused}
          onToggleAutoPlay={() => setIsAutoPlaying(!isAutoPlaying)}
        />
      )}

      {showScrollHint && currentTile === 0 && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 ${
              theme === 'light' ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            <span className="text-sm font-medium">Scroll to explore</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronDown className="w-6 h-6" />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
