import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UseCaseCanvas } from '../components/UseCaseCanvas';
import { socket } from '../lib/socket';

export function IntakePhase() {
    const navigate = useNavigate();
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem('hm_session');
        if (!stored) {
            navigate('/');
            return;
        }
        const parsed = JSON.parse(stored);
        setSession(parsed);

        // Ensure socket connected
        if (!socket.connected) {
            socket.connect();
            socket.emit('join_workshop', { workshop_id: parsed.workshopId });
        }

        const onStateChange = (data: any) => {
            if (data.phase === 'SCORING') navigate('/scoring');
        };
        socket.on('workshop_state_change', onStateChange);

        return () => {
            socket.off('workshop_state_change', onStateChange);
        };

    }, [navigate]);

    if (!session) return null;

    return (
        <div className="min-h-screen bg-surface-900 pb-20">
            <header className="bg-surface-800/50 border-b border-white/5 p-4 sticky top-0 backdrop-blur z-10">
                <div className="max-w-2xl mx-auto flex justify-between items-center">
                    <h1 className="text-lg font-bold text-white">Intake Phase</h1>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-semantic-success animate-pulse" />
                        <span className="text-xs text-gray-400 font-mono">LIVE</span>
                    </div>
                </div>
            </header>

            <UseCaseCanvas session={session} />
        </div>
    );
}
