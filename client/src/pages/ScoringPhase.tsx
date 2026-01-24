import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScoringCard } from '../components/ScoringCard';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { useSession } from '../context/SessionContext';
import { Button } from '../components/ui/Button';
import { LogOut } from 'lucide-react';

export function ScoringPhase() {
    const navigate = useNavigate();
    const { session, logout } = useSession();
    const [workshop, setWorkshop] = useState<any>(null);

    const handleLeave = () => {
        if (confirm("Are you sure you want to leave the scoring session?")) {
            logout();
            navigate('/');
        }
    };
    const [activeCard, setActiveCard] = useState<any>(null);

    useEffect(() => {
        if (!session) {
            navigate('/');
            return;
        }

        fetchWorkshopConfig(session.workshopId);

        socket.on('active_card_update', (data: any) => {
            console.log("Active Card Update:", data);
            setActiveCard(data.active_card);
        });

        // Cleanup
        return () => {
            socket.off('active_card_update');
        };

    }, [navigate, session]);

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
                <div className="flex items-center gap-4">
                    <span className="font-mono text-brand-violet">{workshop.title}</span>
                    <Button variant="ghost" onClick={handleLeave} className="text-gray-400 hover:text-white p-2 h-auto">
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {activeCard ? (
                <ScoringCard
                    key={activeCard.id} // Force re-render on card change to reset local state
                    session={session}
                    activeCard={activeCard}
                    criteria={workshop.config.criteria}
                    templateId={workshop.config.template_id}
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
