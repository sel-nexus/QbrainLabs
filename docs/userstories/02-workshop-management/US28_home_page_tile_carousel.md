# US28: Home Page Tile Carousel View

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** User Interface & Landing Experience  
**Story Type:** Feature  
**Priority:** Medium  
**Story Points:** 13

---

## User Story

**As a** Visitor or User,  
**I want to** view the home page content as full-screen tiles that auto-navigate,  
**So that** I can experience a modern, immersive presentation of the application's value proposition without scrolling.

---

## Description

Transform the home page from a traditional scrolling layout to a full-screen tile carousel view, similar to Squarespace.com. Each section of content becomes a full-viewport tile that automatically transitions to the next tile. Users can also manually navigate between tiles using scroll, swipe gestures, or navigation indicators.

This creates a more engaging, presentation-style experience that showcases the application's features in a cinematic, modern format.

---

## Requirements

### Functional Requirements

1. **Tile-Based Layout**
   - Each content section occupies a full viewport (100vh x 100vw)
   - Minimum tiles: Hero, Features, How It Works, Benefits, Call-to-Action
   - Smooth snap-scrolling between tiles
   - Responsive design for all screen sizes

2. **Auto-Navigation**
   - Automatic progression to next tile every 5-7 seconds
   - Pause auto-navigation on user interaction
   - Resume auto-navigation after 10 seconds of inactivity
   - Optional: Loop back to first tile after reaching the end

3. **Manual Navigation**
   - Scroll/swipe to navigate between tiles
   - Keyboard navigation (arrow keys, Page Up/Down)
   - Click/tap on navigation dots to jump to specific tile
   - Touch gestures for mobile (swipe up/down or left/right)

4. **Navigation Indicators**
   - Dot indicators showing current position
   - Progress bar or visual cue for auto-navigation timing
   - Previous/Next arrow buttons (optional, configurable)
   - Tile count indicator (e.g., "2 of 5")

5. **Transition Animations**
   - Smooth slide or fade transitions between tiles
   - Content reveal animations within each tile
   - Parallax effects for depth (optional)
   - Respect prefers-reduced-motion setting

### Non-Functional Requirements

- Page load time < 2 seconds
- 60fps smooth transitions
- Accessible to keyboard and screen reader users
- SEO-friendly (content still indexable)
- Mobile-first responsive design
- Works offline after initial load

---

## Acceptance Criteria

### Scenario 1: Auto-Navigation
**Given** the user lands on the home page  
**When** they remain idle for 5-7 seconds  
**Then** the view automatically transitions to the next tile  
**And** the navigation indicator updates to reflect the current tile

### Scenario 2: Manual Scroll Navigation
**Given** the user is viewing a tile  
**When** they scroll down (or swipe up on mobile)  
**Then** the view snaps to the next tile  
**And** auto-navigation pauses temporarily

### Scenario 3: Dot Navigation
**Given** the user sees the navigation dots  
**When** they click on a specific dot  
**Then** the view jumps directly to that tile  
**And** the transition is smooth and animated

### Scenario 4: Keyboard Navigation
**Given** the home page is focused  
**When** the user presses the down arrow or Page Down key  
**Then** the view navigates to the next tile  
**And** the focus is managed appropriately for accessibility

### Scenario 5: Mobile Touch Navigation
**Given** the user is on a mobile device  
**When** they swipe up on the screen  
**Then** the view snaps to the next tile  
**And** the gesture feels natural and responsive

### Scenario 6: Pause on Interaction
**Given** auto-navigation is active  
**When** the user interacts with any content (click, scroll, type)  
**Then** auto-navigation pauses  
**And** resumes after 10 seconds of inactivity

---

## Technical Implementation

### Frontend Components

```
src/
├── components/
│   ├── TileCarousel/
│   │   ├── TileCarousel.tsx      # Main container component
│   │   ├── Tile.tsx              # Individual tile wrapper
│   │   ├── TileNavigation.tsx    # Dot indicators & arrows
│   │   ├── TileProgress.tsx      # Auto-nav progress indicator
│   │   └── useTileCarousel.ts    # Custom hook for carousel logic
│   └── HomeTiles/
│       ├── HeroTile.tsx          # Hero/welcome tile
│       ├── FeaturesTile.tsx      # Features showcase tile
│       ├── HowItWorksTile.tsx    # Process explanation tile
│       ├── BenefitsTile.tsx      # Value proposition tile
│       └── CTATile.tsx           # Call-to-action tile
```

### Carousel Hook
```typescript
// hooks/useTileCarousel.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTileCarouselOptions {
  totalTiles: number;
  autoPlayInterval?: number; // ms, default 6000
  pauseOnInteraction?: boolean;
  resumeDelay?: number; // ms, default 10000
}

export const useTileCarousel = (options: UseTileCarouselOptions) => {
  const [currentTile, setCurrentTile] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();
  const pauseTimerRef = useRef<NodeJS.Timeout>();

  const goToTile = useCallback((index: number) => {
    setCurrentTile(Math.max(0, Math.min(index, options.totalTiles - 1)));
  }, [options.totalTiles]);

  const nextTile = useCallback(() => {
    setCurrentTile((prev) => (prev + 1) % options.totalTiles);
  }, [options.totalTiles]);

  const prevTile = useCallback(() => {
    setCurrentTile((prev) => (prev - 1 + options.totalTiles) % options.totalTiles);
  }, [options.totalTiles]);

  const pauseAutoPlay = useCallback(() => {
    setIsPaused(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, options.resumeDelay || 10000);
  }, [options.resumeDelay]);

  // Auto-play logic
  useEffect(() => {
    if (isAutoPlaying && !isPaused) {
      timerRef.current = setInterval(nextTile, options.autoPlayInterval || 6000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAutoPlaying, isPaused, nextTile, options.autoPlayInterval]);

  return {
    currentTile,
    goToTile,
    nextTile,
    prevTile,
    pauseAutoPlay,
    isAutoPlaying,
    isPaused,
    setIsAutoPlaying,
  };
};
```

### CSS Snap Scrolling
```css
/* TileCarousel styles */
.tile-carousel {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
}

.tile {
  height: 100vh;
  width: 100vw;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.tile-navigation {
  position: fixed;
  right: 2rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tile-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
}

.tile-dot.active {
  background: var(--accent-color);
  transform: scale(1.2);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .tile-carousel {
    scroll-behavior: auto;
  }
  .tile * {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## Content Structure

### Tile 1: Hero
- Headline: Value proposition
- Subheadline: Brief description
- Primary CTA button
- Background: Gradient or subtle animation

### Tile 2: Features
- 3-4 key features with icons
- Brief descriptions
- Visual demonstrations or mockups

### Tile 3: How It Works
- Step-by-step process
- Numbered or visual flow
- Interactive elements (optional)

### Tile 4: Benefits
- Key benefits for users
- Statistics or social proof
- Testimonials (optional)

### Tile 5: Call-to-Action
- Strong closing statement
- Primary and secondary CTAs
- Contact or support links

---

## Dependencies

- React (existing)
- CSS scroll-snap (native browser support)
- Intersection Observer API for tile visibility
- Optional: Framer Motion for advanced animations

---

## Testing Requirements

### Unit Tests
- Carousel hook state management
- Navigation function behavior
- Auto-play start/stop/pause logic
- Tile index boundary handling

### Integration Tests
- Scroll navigation between tiles
- Dot navigation functionality
- Keyboard navigation
- Auto-play and pause behavior

### E2E Tests
- Full user journey through all tiles
- Mobile touch navigation
- Auto-navigation timing
- Deep linking to specific tiles

### Accessibility Tests
- Screen reader announcements
- Keyboard navigation
- Focus management
- Reduced motion compliance

### Performance Tests
- Initial load time
- Transition smoothness (60fps)
- Memory usage over time
- Mobile performance

---

## UI/UX Design Specifications

### Visual Design
- Full-bleed backgrounds for each tile
- Consistent typography scale
- Brand colors and gradients
- High-quality imagery or illustrations

### Animation Guidelines
- Tile transition: 0.6s ease-in-out
- Content reveal: Staggered fade-in
- Progress indicator: Linear progression
- Parallax (if used): Subtle, 10-20% offset

### Navigation Design
- Dots: Right side, vertically centered
- Size: 12px diameter, 16px on hover
- Active state: Accent color, 1.2x scale
- Mobile: Bottom-centered horizontal dots

---

## Accessibility Considerations

- ARIA labels for navigation controls
- Screen reader announcements on tile change
- Keyboard navigation (Tab, Arrow keys)
- Skip link to bypass carousel
- Pause button for auto-navigation
- Visible focus indicators
- Prefers-reduced-motion support

---

## Performance Considerations

- Lazy load tile content below the fold
- Optimize images with modern formats (WebP, AVIF)
- Preload next tile content
- Use CSS transforms for animations (GPU-accelerated)
- Avoid layout shifts during transitions

---

## Browser Compatibility

- Chrome 69+ (scroll-snap)
- Firefox 68+ (scroll-snap)
- Safari 11+ (scroll-snap)
- Edge 79+ (scroll-snap)
- Fallback: Standard scroll for older browsers

---

## Related User Stories

- US08: Landing Page (base implementation)
- US14: Theme Switching (carousel respects theme)
- US27: Application Icon & Branding (visual consistency)

---

## Reference

- **Squarespace.com** - Tile-based full-screen navigation with auto-scroll
- Modern SaaS landing pages with immersive scroll experiences

---

## Questions/Clarifications

1. How many tiles should be included initially?
2. Should auto-navigation be enabled by default or user-controlled?
3. What content should be prioritized for each tile?
4. Should there be a "scroll down" indicator on the first tile?
5. Should the carousel loop infinitely or stop at the last tile?

---

## Future Enhancements

- Video backgrounds for tiles
- Interactive content within tiles
- A/B testing different tile orders
- Analytics tracking per tile view time
- Custom tile templates for different campaigns
- Scroll-triggered micro-animations

---

## Definition of Done

- [ ] Tile carousel component implemented
- [ ] All content tiles created (Hero, Features, How It Works, Benefits, CTA)
- [ ] Auto-navigation with configurable timing
- [ ] Manual navigation (scroll, dots, keyboard)
- [ ] Mobile touch/swipe support
- [ ] Accessibility requirements met
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance benchmarks met
- [ ] Cross-browser compatibility verified
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Demo to stakeholders completed
