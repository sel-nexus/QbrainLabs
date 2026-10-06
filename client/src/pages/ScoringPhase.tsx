import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScoringCard } from '../components/ScoringCard';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { useSession } from '../context/SessionContext';
import { Button } from '../components/ui/Button';
import { LogOut, ArrowLeft, Loader2 } from 'lucide-react';
import { LoadErrorPanel } from '../components/StatusPages';
import { errorMessage } from '../lib/apiErrors';

interface ActiveCard {
    id: string;
    title: string;
    description?: string;
    proposed_solution?: string;
}

interface ScoringWorkshop {
    title: string;
    active_use_case_id?: string | null;
    config: { criteria: { name: string; description?: string }[]; template_id?: string };
}

async function loadScoringState(id: string): Promise<{ workshop: ScoringWorkshop; activeCard: ActiveCard | null }> {
    const { data } = await api.get<ScoringWorkshop>(`/workshops/${id}`);
    if (!data.active_use_case_id) return { workshop: data, activeCard: null };
    const { data: useCases } = await api.get<ActiveCard[]>(`/usecases/${id}`);
    const uc = (useCases || []).find((u) => String(u.id) === String(data.active_use_case_id));
    return {
        workshop: data,
        activeCard: uc ? { id: String(uc.id), title: uc.title, description: uc.description, proposed_solution: uc.proposed_solution } : null,
    };
}

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
    const [loadError, setLoadError] = useState<string | null>(null);

    // Load the workshop and whichever card is live right now, so a participant
    // who refreshes, rejoins or reconnects mid-vote sees the current card
    // instead of "wait for the facilitator".
    const refresh = useCallback((id: string) => {
        loadScoringState(id)
            .then(({ workshop: ws, activeCard: card }) => {
                setWorkshop(ws);
                setActiveCard(card);
                setLoadError(null);
            })
            .catch((e) => {
                console.error(e);
                setLoadError(errorMessage(e, 'Could not load the scoring session.'));
            });
    }, []);

    useEffect(() => {
        if (!session) {
            navigate('/');
            return;
        }

        refresh(session.workshopId);

        const onActiveCard = (data: any) => setActiveCard(data.active_card);
        const onReconnect = () => refresh(session.workshopId);
        socket.on('active_card_update', onActiveCard);
        socket.on('connect', onReconnect);

        return () => {
            socket.off('active_card_update', onActiveCard);
            socket.off('connect', onReconnect);
        };
    }, [navigate, session, refresh]);

    if (!session) return null;
    if (!workshop && loadError) {
        return <LoadErrorPanel message={loadError} onRetry={() => refresh(session.workshopId)} />;
    }
    if (!workshop) {
        return (
            <div className="min-h-screen flex items-center justify-center theme-bg-primary" role="status" aria-live="polite">
                <Loader2 className="w-8 h-8 animate-spin text-brand-violet" aria-hidden="true" />
                <span className="sr-only">Loading scoring session</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-900 p-4 pb-20 flex flex-col items-center">
            <header className="w-full max-w-lg mx-auto flex justify-between items-center mb-6">
                <button
                    type="button"
                    onClick={() => navigate('/participant-dashboard')}
                    className="flex items-center gap-1 text-gray-400 hover:text-white text-sm"
                >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Dashboard
                </button>
                <div className="flex items-center gap-4">
                    <span className="font-mono text-brand-violet">{workshop.title}</span>
                    <Button variant="ghost" onClick={handleLeave} className="text-gray-400 hover:text-white p-2 h-auto" aria-label="Leave workshop">
                        <LogOut className="w-4 h-4" aria-hidden="true" />
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
