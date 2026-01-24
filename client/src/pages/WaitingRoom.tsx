import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { useSession } from '../context/SessionContext';

import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { LogOut } from 'lucide-react';

export function WaitingRoom() {
    const navigate = useNavigate();
    const { session, updateRole, logout } = useSession();
    const [status, setStatus] = useState('Waiting for host...');

    const handleLeave = () => {
        logout();
        navigate('/');
    };

    useEffect(() => {
        if (!session) {
            navigate('/');
            return;
        }

        if (session.role === 'PENDING_FACILITATOR') {
            setStatus('Waiting for Host Approval...');
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

        const onRoleUpdate = (data: any) => {
            console.log("Role update:", data);

            if (data.participant_id === session?.participantId) {
                updateRole(data.role);

                if (data.role === 'FACILITATOR') {
                    // Redirect to Admin/Facilitator view
                    navigate(`/workshop/${session.workshopId}`);
                } else if (data.role === 'PARTICIPANT') {
                    setStatus('Waiting for host...');
                }
            }
        };

        socket.on('participant_joined', onJoin);
        socket.on('workshop_state_change', onStateChange);
        socket.on('participant_role_update', onRoleUpdate);

        return () => {
            socket.off('participant_joined', onJoin);
            socket.off('workshop_state_change', onStateChange);
            socket.off('participant_role_update', onRoleUpdate);
        };
    }, [navigate, session, updateRole]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative">
            <Button
                variant="ghost"
                className="absolute top-6 right-6 text-gray-400 hover:text-white"
                onClick={handleLeave}
            >
                <LogOut className="w-4 h-4 mr-2" /> Leave
            </Button>
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-brand-violet rounded-full blur-xl opacity-20 animate-pulse" />
                <div className="w-24 h-24 bg-surface-800 rounded-full border border-white/10 flex items-center justify-center z-10 relative">
                    <span className="text-4xl">
                        {session?.role === 'PENDING_FACILITATOR' ? '🔒' : '⏳'}
                    </span>
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
