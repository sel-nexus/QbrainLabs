import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UseCaseCanvas } from '../components/UseCaseCanvas';
import { socket } from '../lib/socket';
import { useSession } from '../context/SessionContext';
import { Button } from '../components/ui/Button';
import { LogOut } from 'lucide-react';

export function IntakePhase() {
    const navigate = useNavigate();
    const { session, logout } = useSession();

    const handleLeave = () => {
        if (confirm("Are you sure you want to leave the workshop? Your unsaved drafts might be lost.")) {
            logout();
            navigate('/');
        }
    };

    useEffect(() => {
        if (!session) {
            navigate('/');
            return;
        }

        const onStateChange = (data: any) => {
            if (data.phase === 'SCORING') navigate('/scoring');
        };
        socket.on('workshop_state_change', onStateChange);

        return () => {
            socket.off('workshop_state_change', onStateChange);
        };

    }, [navigate, session]);

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
                    <Button variant="ghost" onClick={handleLeave} className="text-gray-400 hover:text-white ml-2">
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            <UseCaseCanvas session={session} />
        </div>
    );
}
