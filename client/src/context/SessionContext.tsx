import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { socket } from '../lib/socket';

interface Session {
    participantId: string;
    workshopId: string;
    name: string;
    role: string;
}

interface SessionContextType {
    session: Session | null;
    isLoading: boolean;
    login: (session: Session) => void;
    logout: () => void;
    updateRole: (role: string) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Use a ref to track session for use in socket callbacks
    // This avoids stale closures without re-subscribing to events constantly
    const sessionRef = React.useRef<Session | null>(null);
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    useEffect(() => {
        const initializeSession = () => {
            try {
                const stored = localStorage.getItem('hm_session');
                if (stored) {
                    const parsedSession = JSON.parse(stored);
                    setSession(parsedSession);
                    sessionRef.current = parsedSession;

                    // Emit join immediately if connected, or the connect listener will handle it
                    if (socket.connected) {
                        socket.emit('join_workshop', { workshop_id: parsedSession.workshopId });
                    }
                }
            } catch (error) {
                console.error("Failed to parse session:", error);
                localStorage.removeItem('hm_session');
            } finally {
                setIsLoading(false);
            }
        };

        initializeSession();

        // Listen for connection events to re-join if dropped/connected
        const onConnect = () => {
            const currentSession = sessionRef.current;
            if (currentSession) {
                socket.emit('join_workshop', { workshop_id: currentSession.workshopId });
            }
        };

        socket.on('connect', onConnect);
        return () => {
            socket.off('connect', onConnect);
        };
    }, []);

    // Effect to handle session changes (e.g. login/logout)
    useEffect(() => {
        if (session && socket.connected) {
            socket.emit('join_workshop', { workshop_id: session.workshopId });
        }
    }, [session]);


    const login = useCallback((newSession: Session) => {
        localStorage.setItem('hm_session', JSON.stringify(newSession));
        sessionRef.current = newSession;
        setSession(newSession);
        if (socket.connected) {
            socket.emit('join_workshop', { workshop_id: newSession.workshopId });
        } else {
            // logout() disconnects the socket; reconnect so the new workshop
            // gets live updates (the connect handler joins its room).
            socket.connect();
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('hm_session');
        sessionRef.current = null;
        setSession(null);
        socket.disconnect();
    }, []);

    const updateRole = useCallback((role: string) => {
        setSession((current) => {
            if (!current) return current;
            const updated = { ...current, role };
            localStorage.setItem('hm_session', JSON.stringify(updated));
            return updated;
        });
    }, []);

    return (
        <SessionContext.Provider value={{ session, isLoading, login, logout, updateRole }}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSession() {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
}
