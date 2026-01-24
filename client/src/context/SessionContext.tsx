import React, { createContext, useContext, useEffect, useState } from 'react';
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

    useEffect(() => {
        const initializeSession = () => {
            try {
                const stored = localStorage.getItem('hm_session');
                if (stored) {
                    const parsedSession = JSON.parse(stored);
                    setSession(parsedSession);

                    // Re-establish socket connection if needed
                    if (!socket.connected) {
                        socket.connect();
                    }
                    // Always emit join on reload/reconnect to ensure server knows we are here
                    // We wrap this in a timeout or check connected to be safe, 
                    // but usually emitting immediately after connect() call works in socket.io client 
                    // as it buffers packets.
                    socket.emit('join_workshop', { workshop_id: parsedSession.workshopId });
                }
            } catch (error) {
                console.error("Failed to parse session:", error);
                localStorage.removeItem('hm_session');
            } finally {
                setIsLoading(false);
            }
        };

        initializeSession();

        // Listen for connection events to re-join if dropped
        const onConnect = () => {
            if (session) {
                socket.emit('join_workshop', { workshop_id: session.workshopId });
            }
        };

        socket.on('connect', onConnect);
        return () => {
            socket.off('connect', onConnect);
        };
    }, []);
    // Note: 'session' dependencies in useEffect might cause loops if not careful, 
    // but here we only want the initial load. 
    // The socket listener uses the closure 'session' which is stale? 
    // Yes, 'session' inside onConnect will be null if defined in the first render's effect.
    // We need a ref or a separate effect for the re-join logic.

    // Separate effect for socket maintenance
    useEffect(() => {
        if (session && socket.connected) {
            socket.emit('join_workshop', { workshop_id: session.workshopId });
        }
    }, [session]);


    const login = (newSession: Session) => {
        localStorage.setItem('hm_session', JSON.stringify(newSession));
        setSession(newSession);
        if (!socket.connected) socket.connect();
        socket.emit('join_workshop', { workshop_id: newSession.workshopId });
    };

    const logout = () => {
        localStorage.removeItem('hm_session');
        setSession(null);
        socket.disconnect();
    };

    const updateRole = (role: string) => {
        if (!session) return;
        const updated = { ...session, role };
        localStorage.setItem('hm_session', JSON.stringify(updated));
        setSession(updated);
    };

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
