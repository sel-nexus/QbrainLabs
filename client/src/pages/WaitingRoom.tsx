import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';

import { useNavigate } from 'react-router-dom';

export function WaitingRoom() {
    const navigate = useNavigate();
    const [status] = useState('Waiting for host...');
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem('hm_session');
        if (stored) {
            setSession(JSON.parse(stored));
        }

        // Socket listeners
        const onJoin = (data: any) => console.log("Joined room:", data);
        const onStateChange = (data: any) => {
            console.log("State changed:", data);
            if (data.phase === 'INTAKE') {
                navigate('/intake');
            } else if (data.phase === 'SCORING') {
                navigate('/scoring');
            }
        };

        socket.on('participant_joined', onJoin);
        socket.on('workshop_state_change', onStateChange);

        return () => {
            socket.off('participant_joined', onJoin);
            socket.off('workshop_state_change', onStateChange);
        };
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-brand-violet rounded-full blur-xl opacity-20 animate-pulse" />
                <div className="w-24 h-24 bg-surface-800 rounded-full border border-white/10 flex items-center justify-center z-10 relative">
                    <span className="text-4xl">⏳</span>
                </div>
            </div>

            <h2 className="text-2xl font-bold mb-2">Welcome, {session?.name}</h2>
            <p className="text-gray-400 animate-pulse">{status}</p>

            <p className="fixed bottom-8 text-xs text-gray-600 font-mono">
                ID: {session?.participantId?.slice(0, 8)}
            </p>
        </div>
    );
}
