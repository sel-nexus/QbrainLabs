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
    LogOut,
    FileText,
    Target,
    Plus
} from 'lucide-react';
import { ActionTile } from '../components/ui/ActionTile';
import { UseCaseCanvas } from '../components/UseCaseCanvas';
import { SurveyParticipant } from '../components/survey/SurveyParticipant';
import { Button } from '../components/ui/Button';
import { PollResponder } from '../components/polls/PollResponder';
import { ReactionBar } from '../components/polls/ReactionBar';
import { ReactionOverlay } from '../components/polls/ReactionOverlay';
import { QAPanel } from '../components/polls/QAPanel';
import { MessageSquare, Trophy, Award } from 'lucide-react';
import { PointsDisplay } from '../components/gamification/PointsDisplay';
import { AchievementToast } from '../components/gamification/AchievementToast';
import { Leaderboard } from '../components/gamification/Leaderboard';
import { BadgeGrid } from '../components/gamification/BadgeGrid';
import { Header } from '../components/Header';
import { UseCaseDetailModal } from '../components/usecases/UseCaseDetailModal';

interface UseCase {
    id: string;
    title: string;
    description?: string;
    participant_id?: string;
    proposed_solution?: string;
    kpi?: string;
    target_user?: string;
    category?: string;
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

type ActiveModal = 'usecase' | 'survey' | 'qa' | 'leaderboard' | 'badges' | null;

export function ParticipantDashboard() {
    const navigate = useNavigate();
    const { } = useTheme();
    const { session, updateRole, logout } = useSession();
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeModal, setActiveModal] = useState<ActiveModal>(null);
    const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);
    const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);

    const fetchSessionInfo = async () => {
        if (!session?.participantId || !session?.workshopId) {
            setLoading(false);
            return;
        }

        try {
            const { data } = await api.get(`/session/${session.participantId}`);
            setSessionInfo(data);
        } catch (err) {
            console.error('Failed to fetch session info:', err);
            // If session fetch fails, redirect to join page
            // This handles cases where participant record was deleted or workshop ended
            if ((err as any)?.response?.status === 404) {
                navigate('/join');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.participantId && session?.workshopId) {
            fetchSessionInfo();
            const interval = setInterval(fetchSessionInfo, 10000);
            return () => clearInterval(interval);
        } else {
            setLoading(false);
        }
    }, [session?.participantId, session?.workshopId]);

    useEffect(() => {
        if (!session) {
            navigate('/');
            return;
        }

        // If session exists but no workshopId, redirect to join page
        // This can happen if a participant logged in but hasn't joined a workshop yet
        if (session && !session.workshopId) {
            navigate('/join');
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

    const handleUseCaseClick = () => {
        setActiveModal('usecase');
    };

    const handlePrioritizeClick = () => {
        navigate('/scoring');
    };

    const handleUseCasesViewClick = () => {
        // Scroll to the use cases section
        const useCasesSection = document.getElementById('use-cases-section');
        if (useCasesSection) {
            useCasesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleHotspotPrioritizationClick = () => {
        navigate('/participant-matrix');
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

    const hasUseCases = (sessionInfo?.use_cases.length || 0) > 0;
    const canPrioritize = hasUseCases; // Enabled whenever use cases exist, regardless of phase

    const activeSurvey = sessionInfo?.surveys.find(s => s.status === 'ACTIVE' && !s.completed);
    const completedSurveys = sessionInfo?.surveys.filter(s => s.completed).length || 0;
    const totalSurveys = sessionInfo?.surveys.length || 0;
    const pendingSurveys = sessionInfo?.surveys.filter(s => s.status === 'ACTIVE' && !s.completed).length || 0;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center theme-bg-primary">
                <div className="flex items-center gap-3 theme-text-secondary">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Loading workshop...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen theme-bg-primary">
            <Header showBackButton={false} showHomeButton={false} />
            {session?.participantId && <AchievementToast participantId={session.participantId} />}
            <ReactionOverlay />
            <PollResponder />
            <ReactionBar />
            {/* Header */}
            <header className="sticky top-14 z-40 border-b backdrop-blur theme-bg-secondary/80 theme-border">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold theme-text-primary">
                            {sessionInfo?.workshop_title || 'Workshop'}
                        </h1>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm theme-text-secondary">
                                Welcome, {session?.name}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-violet/20 text-brand-violet font-medium">
                                {currentPhase}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {session?.participantId && (
                            <PointsDisplay participantId={session.participantId} />
                        )}
                        <Button variant="ghost" onClick={() => setActiveModal('leaderboard')} className="theme-text-secondary hover:theme-text-primary">
                            <Trophy className="w-4 h-4 mr-2" />
                            Leaderboard
                        </Button>
                        <Button variant="ghost" onClick={() => setActiveModal('badges')} className="theme-text-secondary hover:theme-text-primary">
                            <Award className="w-4 h-4 mr-2" />
                            Badges
                        </Button>
                        <Button variant="ghost" onClick={() => setActiveModal('qa')} className="theme-text-secondary hover:theme-text-primary">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Q&A
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 py-8">
                {/* Action Tiles Grid - Show 4 tiles when use cases exist */}
                {(sessionInfo?.use_cases.length || 0) > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tile 1: Use Cases */}
                        <ActionTile
                            icon={<FileText className="w-7 h-7" />}
                            title="Use Cases"
                            description="View all workshop use cases"
                            badge={`${sessionInfo?.use_cases.length || 0} total`}
                            badgeVariant="info"
                            onClick={handleUseCasesViewClick}
                        />

                        {/* Tile 2: Add a New Use Case */}
                        <ActionTile
                            icon={<Plus className="w-7 h-7" />}
                            title="Add a New Use Case"
                            description="Share your AI use case ideas for the workshop"
                            badge="Available"
                            badgeVariant="success"
                            onClick={handleUseCaseClick}
                        />

                        {/* Tile 3: Survey */}
                        <ActionTile
                            icon={<ClipboardCheck className="w-7 h-7" />}
                            title="Survey"
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

                        {/* Tile 4: Hotspot Prioritization */}
                        <ActionTile
                            icon={<Target className="w-7 h-7" />}
                            title="Hotspot Prioritization"
                            description="Prioritize use cases on the hotspot matrix"
                            badge={canPrioritize ? `${sessionInfo?.use_cases.length || 0} available` : "Not available"}
                            badgeVariant={canPrioritize ? "warning" : "default"}
                            disabled={!canPrioritize}
                            disabledReason={
                                !hasUseCases
                                    ? "No use cases available to prioritize"
                                    : undefined
                            }
                            onClick={handleHotspotPrioritizationClick}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Tile 1: Submit Use Case */}
                        <ActionTile
                            icon={<Lightbulb className="w-7 h-7" />}
                            title="Submit Use Case"
                            description="Share your AI use case ideas for the workshop"
                            badge="0 submitted"
                            badgeVariant="info"
                            onClick={handleUseCaseClick}
                        />

                        {/* Tile 2: Prioritize Use Cases */}
                        <ActionTile
                            icon={<BarChart3 className="w-7 h-7" />}
                            title="Prioritize Use Cases"
                            description="Vote and score existing use cases"
                            badge="0 to review"
                            badgeVariant="default"
                            disabled={true}
                            disabledReason="No use cases to prioritize"
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
                )}

                {/* Info Section */}
                <div
                    id="use-cases-section"
                    className="mt-8 p-6 rounded-xl border theme-card theme-border"
                >
                    <h2 className="text-lg font-semibold mb-4 theme-text-primary">
                        Workshop Use Cases ({sessionInfo?.use_cases.length || 0})
                    </h2>

                    {(sessionInfo?.use_cases.length || 0) === 0 ? (
                        <p className="text-sm theme-text-secondary">
                            No use cases submitted yet. Be the first to add one!
                        </p>
                    ) : (
                        <div className="grid gap-3 max-h-64 overflow-y-auto">
                            {sessionInfo?.use_cases.map((uc) => (
                                <div
                                    key={uc.id}
                                    className="p-3 rounded-lg theme-bg-tertiary cursor-pointer hover:theme-bg-secondary transition-colors"
                                    onClick={() => setSelectedUseCase(uc)}
                                >
                                    <div className="font-medium text-sm theme-text-primary">
                                        {uc.title}
                                    </div>
                                    {uc.description && (
                                        <div className="text-xs mt-1 line-clamp-1 theme-text-secondary">
                                            {uc.description}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* QA Modal - Uses dynamic theme colors */}
            {activeModal === 'qa' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-2xl h-[80vh] rounded-2xl overflow-hidden theme-bg-primary">
                        <button
                            onClick={handleModalClose}
                            className="absolute top-4 right-4 z-10 p-2 rounded-lg transition hover:opacity-80 contrast-muted hover:theme-text-primary"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <QAPanel className="h-full pt-10" />
                    </div>
                </div>
            )}

            {/* Use Case Modal */}
            {activeModal === 'usecase' && session && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl theme-bg-primary">
                        <button
                            onClick={handleModalClose}
                            className="absolute top-4 right-4 z-10 p-2 rounded-lg transition theme-text-secondary hover:theme-bg-tertiary hover:theme-text-primary"
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
                    <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 theme-card">
                        <button
                            onClick={handleModalClose}
                            className="absolute top-4 right-4 p-2 rounded-lg transition theme-text-secondary hover:theme-bg-tertiary hover:theme-text-primary"
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

            {/* Leaderboard Modal */}
            {activeModal === 'leaderboard' && session?.workshopId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 theme-card">
                        <button
                            onClick={handleModalClose}
                            className="absolute top-4 right-4 p-2 rounded-lg transition theme-text-secondary hover:theme-bg-tertiary hover:theme-text-primary"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <Leaderboard
                            workshopPin={session.workshopId}
                            currentParticipantId={session.participantId}
                        />
                    </div>
                </div>
            )}

            {/* Badges Modal */}
            {activeModal === 'badges' && session?.participantId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 theme-card">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold theme-text-primary">
                                Your Badges
                            </h2>
                            <button
                                onClick={handleModalClose}
                                className="p-2 rounded-lg transition theme-text-secondary hover:theme-bg-tertiary hover:theme-text-primary"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <BadgeGrid
                            participantId={session.participantId}
                            workshopId={session.workshopId}
                        />
                    </div>
                </div>
            )}

            {/* Use Case Detail Modal */}
            {selectedUseCase && session?.participantId && (
                <UseCaseDetailModal
                    useCase={selectedUseCase}
                    participantId={session.participantId}
                    isOwner={selectedUseCase.participant_id === session.participantId}
                    onClose={() => {
                        setSelectedUseCase(null);
                        fetchSessionInfo();
                    }}
                    onUpdate={fetchSessionInfo}
                />
            )}
        </div>
    );
}
