import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTileCarouselOptions {
  totalTiles: number;
  autoPlayInterval?: number;
  pauseOnInteraction?: boolean;
  resumeDelay?: number;
  loop?: boolean;
}

interface UseTileCarouselReturn {
  currentTile: number;
  goToTile: (index: number) => void;
  nextTile: () => void;
  prevTile: () => void;
  pauseAutoPlay: () => void;
  isAutoPlaying: boolean;
  isPaused: boolean;
  setIsAutoPlaying: (value: boolean) => void;
  progress: number;
}

export const useTileCarousel = (options: UseTileCarouselOptions): UseTileCarouselReturn => {
  const {
    totalTiles,
    autoPlayInterval = 6000,
    pauseOnInteraction = true,
    resumeDelay = 10000,
    loop = true,
  } = options;

  const [currentTile, setCurrentTile] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressStartTimeRef = useRef<number>(0);

  const clearAllTimers = useCallback(() => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const goToTile = useCallback((index: number) => {
    const newIndex = Math.max(0, Math.min(index, totalTiles - 1));
    setCurrentTile(newIndex);
    setProgress(0);
    progressStartTimeRef.current = Date.now();
  }, [totalTiles]);

  const nextTile = useCallback(() => {
    setCurrentTile((prev) => {
      if (loop) {
        return (prev + 1) % totalTiles;
      }
      return Math.min(prev + 1, totalTiles - 1);
    });
    setProgress(0);
    progressStartTimeRef.current = Date.now();
  }, [totalTiles, loop]);

  const prevTile = useCallback(() => {
    setCurrentTile((prev) => {
      if (loop) {
        return (prev - 1 + totalTiles) % totalTiles;
      }
      return Math.max(prev - 1, 0);
    });
    setProgress(0);
    progressStartTimeRef.current = Date.now();
  }, [totalTiles, loop]);

  const pauseAutoPlay = useCallback(() => {
    if (!pauseOnInteraction) return;
    
    setIsPaused(true);
    setProgress(0);
    
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }
    
    pauseTimerRef.current = setTimeout(() => {
      setIsPaused(false);
      progressStartTimeRef.current = Date.now();
    }, resumeDelay);
  }, [pauseOnInteraction, resumeDelay]);

  useEffect(() => {
    if (!isAutoPlaying || isPaused) {
      clearAllTimers();
      return;
    }

    progressStartTimeRef.current = Date.now();

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - progressStartTimeRef.current;
      const newProgress = Math.min((elapsed / autoPlayInterval) * 100, 100);
      setProgress(newProgress);
    }, 50);

    autoPlayTimerRef.current = setTimeout(() => {
      nextTile();
    }, autoPlayInterval);

    return () => {
      clearAllTimers();
    };
  }, [isAutoPlaying, isPaused, currentTile, autoPlayInterval, nextTile, clearAllTimers]);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return {
    currentTile,
    goToTile,
    nextTile,
    prevTile,
    pauseAutoPlay,
    isAutoPlaying,
    isPaused,
    setIsAutoPlaying,
    progress,
  };
};
