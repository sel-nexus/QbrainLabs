import { useEffect, useRef } from 'react';
import { socket } from '../lib/socket';

/** Slow safety-net poll; socket events do the real-time work. */
export const FALLBACK_REFRESH_MS = 60_000;

/**
 * Calls `refresh` once, again whenever one of `events` arrives on the socket
 * or the socket reconnects, and every `fallbackMs` in case an event was missed.
 */
export function useLiveRefresh(refresh: () => void, events: string[], enabled = true, fallbackMs = FALLBACK_REFRESH_MS) {
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;
    const eventKey = events.join('|');

    useEffect(() => {
        if (!enabled) return;
        const run = () => refreshRef.current();
        run();
        const names = [...eventKey.split('|').filter(Boolean), 'connect'];
        names.forEach((name) => socket.on(name, run));
        const interval = setInterval(run, fallbackMs);
        return () => {
            clearInterval(interval);
            names.forEach((name) => socket.off(name, run));
        };
    }, [eventKey, enabled, fallbackMs]);
}
