import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScoringCard } from '../components/ScoringCard';
import { api } from '../lib/api';
import { socket } from '../lib/socket';

export function ScoringPhase() {
    const navigate = useNavigate();
    const [session, setSession] = useState<any>(null);
    const [workshop, setWorkshop] = useState<any>(null);
    const [activeCard, setActiveCard] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem('hm_session');
        if (!stored) {
            navigate('/');
            return;
        }
        const parsed = JSON.parse(stored);
        setSession(parsed);

        fetchWorkshopConfig(parsed.workshopId);

        // Ensure connection
        if (!socket.connected) {
            socket.connect();
            socket.emit('join_workshop', { workshop_id: parsed.workshopId });
        }

        socket.on('active_card_update', (data: any) => {
            console.log("Active Card Update:", data);
            setActiveCard(data.active_card);
        });

        // Cleanup
        return () => {
            socket.off('active_card_update');
        };

    }, [navigate]);

    const fetchWorkshopConfig = async (id: string) => {
        try {
            const { data } = await api.get(`/workshops/${id}`);
            setWorkshop(data);

            // If there's already an active card (rejoin), we'd need to fetch it.
            // MVP: We wait for update or fetch active state API (omitted for brevity)
        } catch (e) {
            console.error(e);
        }
    };

    if (!workshop || !session) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-surface-900 p-4 pb-20 flex flex-col items-center">
            <header className="w-full max-w-lg mx-auto flex justify-between items-center mb-6">
                <span className="text-gray-400 text-sm">Scoring Phase</span>
                <span className="font-mono text-brand-violet">{workshop.title}</span>
            </header>

            {activeCard ? (
                <ScoringCard
                    key={activeCard.id} // Force re-render on card change to reset local state
                    session={session}
                    activeCard={activeCard}
                    criteria={workshop.config.criteria}
                />
            ) : (
                <div className="text-center py-20 opacity-50">
                    <div className="text-6xl mb-4">👀</div>
                    <p>Wait for the facilitator to present an item.</p>
                </div>
            )}
        </div>
    );
}
