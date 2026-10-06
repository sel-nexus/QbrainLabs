import { WifiOff } from 'lucide-react';
import { useSocketStatus } from '../hooks/useSocketStatus';

/**
 * Shown app-wide while the live connection is down after having been up,
 * so participants and facilitators know updates are paused, not lost.
 */
export function ConnectionBanner() {
    const status = useSocketStatus();
    if (status !== 'reconnecting') return null;
    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-2 bg-amber-500 text-black text-sm font-medium px-4 py-2"
        >
            <WifiOff className="w-4 h-4" aria-hidden="true" />
            Connection lost — reconnecting… Your work is saved on this device.
        </div>
    );
}
