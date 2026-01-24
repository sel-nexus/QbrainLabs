import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';

import { useNavigate } from 'react-router-dom';

export function WaitingRoom() {
    const navigate = useNavigate();
    const [status, setStatus] = useState('Waiting for host...');
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem('hm_session');
        if (stored) {
            const sess = JSON.parse(stored);
            setSession(sess);
            if (sess.role === 'PENDING_FACILITATOR') {
                setStatus('Waiting for Host Approval...');
            }
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
            const currentSession = JSON.parse(localStorage.getItem('hm_session') || '{}');
            if (data.participant_id === currentSession.participantId) {
                // Update local storage
                currentSession.role = data.role;
                localStorage.setItem('hm_session', JSON.stringify(currentSession));
                setSession(currentSession);

                if (data.role === 'FACILITATOR') {
                    // Redirect to Admin/Facilitator view
                    // For MVP, maybe just stay here or go to /workshop-detail which handles Facilitator view?
                    // Assuming /workshop/{id} is the facilitator view or similar.
                    // The user story says "redirected to the Facilitator Dashboard".
                    // Let's assume there is a route for it.
                    // Looking at file list, `WorkshopDetail.tsx` seems to be it.
                    navigate(`/workshop/${currentSession.workshopId}`);
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
    }, [navigate]); // Add navigate dependency

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
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
