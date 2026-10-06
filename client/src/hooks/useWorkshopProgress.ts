import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { socket } from '../lib/socket';

export interface WorkshopProgress {
    participants: number;
    use_cases: number;
    submitters: number;
    scorers: number;
    votes_by_use_case: Record<string, number>;
    active_use_case_id: string | null;
    active_card_votes: number;
}

const LIVE_EVENTS = [
    'participant_joined',
    'new_submission',
    'use_case_deleted',
    'vote_update',
    'matrix:position_update',
    'active_card_update',
    'workshop_state_change',
    'connect',
];

/**
 * Live joined / submitted / scored counts for the facilitator console.
 * Refreshes (debounced) on relevant socket events, with a slow poll as a
 * fallback in case an event is missed.
 */
export function useWorkshopProgress(workshopId: string | undefined, enabled = true) {
    const [progress, setProgress] = useState<WorkshopProgress | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const load = useCallback(() => {
        if (!workshopId) return;
        api.get<WorkshopProgress>(`workshops/${workshopId}/progress`)
            .then(({ data }) => setProgress(data))
            .catch(() => undefined); // counts are best-effort; the console still works without them
    }, [workshopId]);

    useEffect(() => {
        if (!workshopId || !enabled) return;
        load();
        const refreshSoon = () => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(load, 400);
        };
        LIVE_EVENTS.forEach((e) => socket.on(e, refreshSoon));
        const interval = setInterval(load, 15000);
        return () => {
            LIVE_EVENTS.forEach((e) => socket.off(e, refreshSoon));
            clearInterval(interval);
            if (timer.current) clearTimeout(timer.current);
        };
    }, [workshopId, enabled, load]);

    return { progress, refresh: load };
}
