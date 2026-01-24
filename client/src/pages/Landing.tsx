import { useTheme } from '../context/ThemeContext';
import { TileCarousel } from '../components/TileCarousel';
import { HeroTile, FeaturesTile, HowItWorksTile, BenefitsTile, CTATile } from '../components/HomeTiles';

export function Landing() {
    const { theme } = useTheme();

    return (
        <div className={`h-[calc(100vh-56px)] overflow-hidden ${theme === 'light' ? 'bg-white text-gray-900' : 'bg-surface-900 text-white'}`}>
            <TileCarousel
                autoPlayInterval={6000}
                showNavigation={true}
                showScrollHint={true}
                loop={true}
            >
                <HeroTile />
                <FeaturesTile />
                <HowItWorksTile />
                <BenefitsTile />
                <CTATile />
            </TileCarousel>
        </div>
    );
}
