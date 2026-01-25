import { useTheme } from '../context/ThemeContext';
import { TileCarousel } from '../components/TileCarousel';
import { HeroTile, FeaturesTile, HowItWorksTile, BenefitsTile, CTATile } from '../components/HomeTiles';
import { Header } from '../components/Header';

export function Landing() {
    const { theme } = useTheme();

    return (
        <div className={`min-h-screen ${theme === 'light' ? 'bg-white text-gray-900' : 'bg-surface-900 text-white'}`}>
            {/* Header with Logo and App Name */}
            <Header showBackButton={false} showHomeButton={false} />
            
            {/* Main Content - offset by header height */}
            <div className="pt-14 h-screen overflow-hidden">
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
        </div>
    );
}
