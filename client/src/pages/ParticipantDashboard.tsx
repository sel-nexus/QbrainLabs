import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { 
    Lightbulb, 
    BarChart3, 
    ClipboardCheck, 
    Loader2, 
    X,
    LogOut
} from 'lucide-react';
import { ActionTile } from '../components/ui/ActionTile';
import { UseCaseCanvas } from '../components/UseCaseCanvas';
import { SurveyParticipant } from '../components/survey/SurveyParticipant';
import { Button } from '../components/ui/Button';

interface UseCase {
    id: string;
    title: string;
    description?: string;
}

interface Survey {
    id: string;
    title: string;
    status: string;
    completed: boolean;
}

interface SessionInfo {
    workshop_id: string;
    workshop_title: string;
    workshop_status: string;
    current_phase: string;
    use_cases: UseCase[];
    surveys: Survey[];
}

type ActiveModal = 'usecase' | 'survey' | null;

export function ParticipantDashboard() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { session, updateRole, logout } = useSession();
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeModal, setActiveModal] = useState<ActiveModal>(null);
    const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);

    const fetchSessionInfo = async () => {
        if (!session?.participantId) return;
        
        try {
            const { data } = await api.get(`/session/${session.participantId}`);
            setSessionInfo(data);
        } catch (err) {
            console.error('Failed to fetch session info:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessionInfo();
        const interval = setInterval(fetchSessionInfo, 10000);
        return () => clearInterval(interval);
    }, [session?.participantId]);

    useEffect(() => {
        if (!session) {
            navigate('/');
            return;
        }

        const onStateChange = (data: any) => {
            console.log("State changed:", data);
            fetchSessionInfo();
            if (data.phase === 'SCORING') {
                navigate('/scoring');
            }
        };

        const onRoleUpdate = (data: any) => {
            if (data.participant_id === session?.participantId) {
                updateRole(data.role);
                if (data.role === 'FACILITATOR') {
                    navigate(`/workshop/${session.workshopId}`);
                }
            }
        };

        const onUseCaseAdded = () => fetchSessionInfo();
        const onSurveyUpdate = () => fetchSessionInfo();

        socket.on('workshop_state_change', onStateChange);
        socket.on('participant_role_update', onRoleUpdate);
        socket.on('use_case_added', onUseCaseAdded);
        socket.on('survey_status_changed', onSurveyUpdate);

        return () => {
            socket.off('workshop_state_change', onStateChange);
            socket.off('participant_role_update', onRoleUpdate);
            socket.off('use_case_added', onUseCaseAdded);
            socket.off('survey_status_changed', onSurveyUpdate);
        };
    }, [navigate, session, updateRole]);

    const handleLeave = () => {
        if (confirm("Are you sure you want to leave the workshop?")) {
            logout();
            navigate('/');
        }
    };

    const handleUseCaseClick = () => {
        setActiveModal('usecase');
    };

    const handlePrioritizeClick = () => {
        navigate('/scoring');
    };

    const handleSurveyClick = () => {
        const activeSurvey = sessionInfo?.surveys.find(s => s.status === 'ACTIVE' && !s.completed);
        if (activeSurvey) {
            setActiveSurveyId(activeSurvey.id);
            setActiveModal('survey');
        }
    };

    const handleModalClose = () => {
        setActiveModal(null);
        setActiveSurveyId(null);
        fetchSessionInfo();
    };

    const handleSurveyComplete = () => {
        setActiveModal(null);
        setActiveSurveyId(null);
        fetchSessionInfo();
    };

    const currentPhase = sessionInfo?.current_phase || 'LOBBY';
    const canSubmitUseCases = ['LOBBY', 'OPEN', 'IN_PROGRESS', 'INTAKE'].includes(currentPhase);
    const canPrioritize = currentPhase === 'SCORING' && (sessionInfo?.use_cases.length || 0) > 0;
    
    const activeSurvey = sessionInfo?.surveys.find(s => s.status === 'ACTIVE' && !s.completed);
    const completedSurveys = sessionInfo?.surveys.filter(s => s.completed).length || 0;
    const totalSurveys = sessionInfo?.surveys.length || 0;
    const pendingSurveys = sessionInfo?.surveys.filter(s => s.status === 'ACTIVE' && !s.completed).length || 0;

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${
                theme === 'light' ? 'bg-gray-50' : 'bg-surface-900'
            }`}>
                <div className="flex items-center gap-3 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Loading workshop...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${theme === 'light' ? 'bg-gray-50' : 'bg-surface-900'}`}>
            {/* Header */}
            <header className={`sticky top-14 z-40 border-b backdrop-blur ${
                theme === 'light' 
                    ? 'bg-white/80 border-gray-200' 
                    : 'bg-surface-800/80 border-white/5'
            }`}>
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className={`text-xl font-bold ${
                            theme === 'light' ? 'text-gray-900' : 'text-white'
                        }`}>
                            {sessionInfo?.workshop_title || 'Workshop'}
                        </h1>
                        <div className="flex items-center gap-3 mt-1">
                            <span className={`text-sm ${
                                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                                Welcome, {session?.name}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-violet/20 text-brand-violet font-medium">
                                {currentPhase}
                            </span>
                        </div>
                    </div>
                    <Button variant="ghost" onClick={handleLeave} className="text-gray-400 hover:text-white">
                        <LogOut className="w-4 h-4 mr-2" />
                        Leave
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 py-8">
                {/* Action Tiles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Tile 1: Submit Use Case */}
                    <ActionTile
                        icon={<Lightbulb className="w-7 h-7" />}
                        title="Submit Use Case"
                        description="Share your AI use case ideas for the workshop"
                        badge={`${sessionInfo?.use_cases.length || 0} submitted`}
                        badgeVariant="info"
                        disabled={!canSubmitUseCases}
                        disabledReason={!canSubmitUseCases ? "Submissions closed during scoring phase" : undefined}
                        onClick={handleUseCaseClick}
                    />

                    {/* Tile 2: Prioritize Use Cases */}
                    <ActionTile
                        icon={<BarChart3 className="w-7 h-7" />}
                        title="Prioritize Use Cases"
                        description="Vote and score existing use cases"
                        badge={`${sessionInfo?.use_cases.length || 0} to review`}
                        badgeVariant={canPrioritize ? "warning" : "default"}
                        disabled={!canPrioritize}
                        disabledReason={
                            currentPhase !== 'SCORING' 
                                ? "Available during scoring phase" 
                                : (sessionInfo?.use_cases.length || 0) === 0 
                                    ? "No use cases to prioritize" 
                                    : undefined
                        }
                        onClick={handlePrioritizeClick}
                    />

                    {/* Tile 3: Complete Survey */}
                    <ActionTile
                        icon={<ClipboardCheck className="w-7 h-7" />}
                        title="Complete Survey"
                        description={activeSurvey ? activeSurvey.title : "Provide your feedback"}
                        badge={
                            pendingSurveys > 0 
                                ? `${pendingSurveys} pending` 
                                : totalSurveys > 0 
                                    ? `${completedSurveys}/${totalSurveys} done`
                                    : "No surveys"
                        }
                        badgeVariant={
                            pendingSurveys > 0 
                                ? "warning" 
                                : completedSurveys === totalSurveys && totalSurveys > 0 
                                    ? "success" 
                                    : "default"
                        }
                        disabled={!activeSurvey}
                        disabledReason={
                            !activeSurvey 
                                ? totalSurveys === 0 
                                    ? "No surveys available" 
                                    : "All surveys completed"
                                : undefined
                        }
                        onClick={handleSurveyClick}
                    />
                </div>

                {/* Info Section */}
                <div className={`mt-8 p-6 rounded-xl border ${
                    theme === 'light' 
                        ? 'bg-white border-gray-200' 
                        : 'bg-surface-800 border-white/10'
                }`}>
                    <h2 className={`text-lg font-semibold mb-4 ${
                        theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                        Workshop Use Cases ({sessionInfo?.use_cases.length || 0})
                    </h2>
                    
                    {(sessionInfo?.use_cases.length || 0) === 0 ? (
                        <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                            No use cases submitted yet. Be the first to add one!
                        </p>
                    ) : (
                        <div className="grid gap-3 max-h-64 overflow-y-auto">
                            {sessionInfo?.use_cases.map((uc) => (
                                <div 
                                    key={uc.id} 
                                    className={`p-3 rounded-lg ${
                                        theme === 'light' ? 'bg-gray-50' : 'bg-surface-700'
                                    }`}
                                >
                                    <div className={`font-medium text-sm ${
                                        theme === 'light' ? 'text-gray-800' : 'text-white'
                                    }`}>
                                        {uc.title}
                                    </div>
                                    {uc.description && (
                                        <div className={`text-xs mt-1 line-clamp-1 ${
                                            theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                        }`}>
                                            {uc.description}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Use Case Modal */}
            {activeModal === 'usecase' && session && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl ${
                        theme === 'light' ? 'bg-gray-50' : 'bg-surface-900'
                    }`}>
                        <button
                            onClick={handleModalClose}
                            className={`absolute top-4 right-4 z-10 p-2 rounded-lg transition ${
                                theme === 'light' 
                                    ? 'hover:bg-gray-200 text-gray-500' 
                                    : 'hover:bg-surface-700 text-gray-400'
                            }`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <UseCaseCanvas session={session} />
                    </div>
                </div>
            )}

            {/* Survey Modal */}
            {activeModal === 'survey' && activeSurveyId && session?.participantId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 ${
                        theme === 'light' ? 'bg-white' : 'bg-surface-800'
                    }`}>
                        <button
                            onClick={handleModalClose}
                            className={`absolute top-4 right-4 p-2 rounded-lg transition ${
                                theme === 'light' 
                                    ? 'hover:bg-gray-100 text-gray-500' 
                                    : 'hover:bg-surface-700 text-gray-400'
                            }`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <SurveyParticipant
                            surveyId={activeSurveyId}
                            participantId={session.participantId}
                            onComplete={handleSurveyComplete}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
