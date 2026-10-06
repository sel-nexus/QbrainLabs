import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { MessageSquare, Trophy, Award, ArrowRight } from 'lucide-react';
import { TopIdeas } from '../components/participant/TopIdeas';
import { phaseLabel } from '../lib/workshopPhases';
import { PointsDisplay } from '../components/gamification/PointsDisplay';
import { AchievementToast } from '../components/gamification/AchievementToast';
import { Leaderboard } from '../components/gamification/Leaderboard';
import { BadgeGrid } from '../components/gamification/BadgeGrid';
import { Header } from '../components/Header';
import { UseCaseDetailModal } from '../components/usecases/UseCaseDetailModal';
import { FALLBACK_REFRESH_MS } from '../hooks/useLiveRefresh';

interface UseCase {
    id: string;
    title: string;
    description: string;
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
    show_leaderboard?: boolean;
}

type ActiveModal = 'usecase' | 'survey' | 'qa' | 'leaderboard' | 'badges' | 'results' | null;

export function ParticipantDashboard() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { } = useTheme();
    const { session, updateRole } = useSession();
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeModal, setActiveModal] = useState<ActiveModal>(null);
    const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);
    const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
    const [showOnlyMine, setShowOnlyMine] = useState(false);
    // While the participant is writing a use case, a phase change must not
    // navigate away; we show a banner and continue once they're done.
    const [scoringStartedWhileWriting, setScoringStartedWhileWriting] = useState(false);
    const writingRef = useRef(false);
    const activeModalRef = useRef<ActiveModal>(null);
    useEffect(() => {
        activeModalRef.current = activeModal;
    }, [activeModal]);
    const handleDraftDirtyChange = useCallback((dirty: boolean) => {
        writingRef.current = dirty;
    }, []);

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
            // Socket events (below) keep this live; this is a slow safety net.
            const interval = setInterval(fetchSessionInfo, FALLBACK_REFRESH_MS);
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
                if (activeModalRef.current === 'usecase' && writingRef.current) {
                    setScoringStartedWhileWriting(true);
                } else {
                    navigate('/scoring');
                }
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

        // After a dropped connection, pick up anything missed while offline.
        const onReconnect = () => fetchSessionInfo();
        socket.on('connect', onReconnect);
        socket.on('workshop_state_change', onStateChange);
        socket.on('participant_role_update', onRoleUpdate);
        socket.on('use_case_added', onUseCaseAdded);
        socket.on('survey_status_changed', onSurveyUpdate);
        socket.on('workshop_updated', onSurveyUpdate);

        return () => {
            socket.off('connect', onReconnect);
            socket.off('workshop_state_change', onStateChange);
            socket.off('participant_role_update', onRoleUpdate);
            socket.off('use_case_added', onUseCaseAdded);
            socket.off('survey_status_changed', onSurveyUpdate);
            socket.off('workshop_updated', onSurveyUpdate);
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
        if (scoringStartedWhileWriting) {
            // The draft (if any) stays saved; continue to the live scoring.
            setScoringStartedWhileWriting(false);
            navigate('/scoring');
            return;
        }
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
    const isComplete = sessionInfo?.workshop_status === 'COMPLETED';
    const isMine = (uc: UseCase) => !!session?.participantId && uc.participant_id === session.participantId;
    const myUseCaseCount = (sessionInfo?.use_cases || []).filter(isMine).length;
    const visibleUseCases = (sessionInfo?.use_cases || []).filter((uc) => !showOnlyMine || isMine(uc));
    const highlightAddTile = !isComplete && currentPhase === 'INTAKE';

    // One clear "what to do now" per phase.
    const nextStep: { step?: string; title: string; detail: string; action?: { label: string; onClick: () => void } } =
        isComplete ? {
            title: 'The workshop is complete — thank you!',
            detail: 'Here are the use cases the group ranked highest.',
            action: { label: 'See top use cases', onClick: () => setActiveModal('results') },
        } : currentPhase === 'INTAKE' ? {
            step: 'Step 1 of 3',
            title: 'Add your AI use case ideas',
            detail: 'Describe a problem AI could help with. You can add as many as you like.',
            action: { label: 'Add a use case', onClick: handleUseCaseClick },
        } : currentPhase === 'SCORING' ? {
            step: 'Step 2 of 3',
            title: 'Score the use cases',
            detail: 'The facilitator presents each use case; rate it against the criteria.',
            action: { label: 'Go to scoring', onClick: () => navigate('/scoring') },
        } : currentPhase === 'ANALYSIS' ? {
            step: 'Step 3 of 3',
            title: 'See the results',
            detail: 'Scoring is closed. See which use cases came out on top.',
            action: { label: 'See top use cases', onClick: () => setActiveModal('results') },
        } : {
            title: 'Waiting for the facilitator to start',
            detail: "You're in. This page updates automatically when the workshop begins.",
        };

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
        <div className="min-h-screen theme-bg-primary pt-[64px]">
            <Header showBackButton={false} showHomeButton={false} />
            {session?.participantId && <AchievementToast participantId={session.participantId} />}
            <ReactionOverlay />
            <PollResponder />
            <ReactionBar />
            {/* Header */}
            <header className="sticky top-[64px] z-40 border-b backdrop-blur theme-bg-secondary/80 theme-border">
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
                                {isComplete ? 'Complete' : phaseLabel(currentPhase)}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {session?.participantId && (
                            <PointsDisplay participantId={session.participantId} />
                        )}
                        {sessionInfo?.show_leaderboard && (
                            <Button variant="ghost" onClick={() => setActiveModal('leaderboard')} aria-label="Leaderboard" className="theme-text-secondary hover:theme-text-primary px-2 sm:px-4">
                                <Trophy className="w-4 h-4 sm:mr-2" aria-hidden="true" />
                                <span className="hidden sm:inline">Leaderboard</span>
                            </Button>
                        )}
                        <Button variant="ghost" onClick={() => setActiveModal('badges')} aria-label="Badges" className="theme-text-secondary hover:theme-text-primary px-2 sm:px-4">
                            <Award className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Badges</span>
                        </Button>
                        <Button variant="ghost" onClick={() => setActiveModal('qa')} aria-label="Questions and answers" className="theme-text-secondary hover:theme-text-primary px-2 sm:px-4">
                            <MessageSquare className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Q&A</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 py-8 pb-32">
                {/* What to do now: one clear next step per phase */}
                <section
                    aria-labelledby="next-step-title"
                    className="mb-8 rounded-2xl border border-brand-violet/30 bg-brand-violet/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                    <div className="flex-1">
                        {nextStep.step && (
                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-violet">{nextStep.step}</p>
                        )}
                        <h2 id="next-step-title" className="text-lg font-bold theme-text-primary">{nextStep.title}</h2>
                        <p className="text-sm theme-text-secondary mt-1">{nextStep.detail}</p>
                    </div>
                    {nextStep.action && (
                        <Button onClick={nextStep.action.onClick} className="shrink-0">
                            {nextStep.action.label} <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                        </Button>
                    )}
                </section>

                {/* Action Tiles Grid - Show 4 tiles when use cases exist */}
                {(sessionInfo?.use_cases.length || 0) > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                        {/* Tile 1: Use Cases */}
                        <ActionTile
                            icon={<FileText className="w-7 h-7" />}
                            title={t('dashboard.participant.tiles.useCases.title')}
                            description={t('dashboard.participant.tiles.useCases.description')}
                            badge={`${sessionInfo?.use_cases.length || 0} total`}
                            badgeVariant="info"
                            onClick={handleUseCasesViewClick}
                        />

                        {/* Tile 2: Add a New Use Case */}
                        <div className={highlightAddTile ? 'rounded-2xl ring-2 ring-brand-violet ring-offset-2 ring-offset-transparent' : ''}>
                        <ActionTile
                            icon={<Plus className="w-7 h-7" />}
                            title={t('dashboard.participant.tiles.addUseCase.title')}
                            description={t('dashboard.participant.tiles.addUseCase.description')}
                            badge="Available"
                            badgeVariant="success"
                            onClick={handleUseCaseClick}
                        />
                        </div>

                        {/* Tile 3: Survey */}
                        <ActionTile
                            icon={<ClipboardCheck className="w-7 h-7" />}
                            title={t('dashboard.participant.tiles.survey.title')}
                            description={activeSurvey ? activeSurvey.title : t('dashboard.participant.tiles.survey.description')}
                            badge={
                                pendingSurveys > 0
                                    ? `${pendingSurveys} ${t('dashboard.participant.tiles.survey.pending')}`
                                    : totalSurveys > 0
                                        ? `${completedSurveys}/${totalSurveys} ${t('dashboard.participant.tiles.survey.done')}`
                                        : t('dashboard.participant.tiles.survey.noSurveys')
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
                                        ? t('dashboard.participant.tiles.survey.unavailable')
                                        : t('dashboard.participant.tiles.survey.completed')
                                    : undefined
                            }
                            onClick={handleSurveyClick}
                        />

                        {/* Tile 4: Prioritization matrix */}
                        <ActionTile
                            icon={<Target className="w-7 h-7" />}
                            title="Prioritization matrix"
                            description={t('dashboard.participant.tiles.prioritize.description')}
                            badge={canPrioritize ? `${sessionInfo?.use_cases.length || 0} ${t('dashboard.participant.tiles.prioritize.available')}` : "Not available"}
                            badgeVariant={canPrioritize ? "warning" : "default"}
                            disabled={!canPrioritize}
                            disabledReason={
                                !hasUseCases
                                    ? t('dashboard.participant.tiles.prioritize.noUseCases')
                                    : undefined
                            }
                            onClick={handleHotspotPrioritizationClick}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Tile 1: Submit Use Case */}
                        <div className={highlightAddTile ? 'rounded-2xl ring-2 ring-brand-violet ring-offset-2 ring-offset-transparent' : ''}>
                        <ActionTile
                            icon={<Lightbulb className="w-7 h-7" />}
                            title={t('dashboard.participant.tiles.submitUseCase.title')}
                            description={t('dashboard.participant.tiles.addUseCase.description')}
                            badge={`0 ${t('dashboard.participant.tiles.submitUseCase.badge')}`}
                            badgeVariant="info"
                            onClick={handleUseCaseClick}
                        />
                        </div>

                        {/* Tile 2: Prioritize Use Cases */}
                        <ActionTile
                            icon={<BarChart3 className="w-7 h-7" />}
                            title={t('dashboard.participant.tiles.prioritize.title')}
                            description={t('dashboard.participant.tiles.prioritize.description')}
                            badge="0 to review"
                            badgeVariant="default"
                            disabled={true}
                            disabledReason={t('dashboard.participant.tiles.prioritize.noUseCases')}
                            onClick={handlePrioritizeClick}
                        />

                        {/* Tile 3: Complete Survey */}
                        <ActionTile
                            icon={<ClipboardCheck className="w-7 h-7" />}
                            title={t('dashboard.participant.tiles.survey.title')}
                            description={activeSurvey ? activeSurvey.title : t('dashboard.participant.tiles.survey.description')}
                            badge={
                                pendingSurveys > 0
                                    ? `${pendingSurveys} ${t('dashboard.participant.tiles.survey.pending')}`
                                    : totalSurveys > 0
                                        ? `${completedSurveys}/${totalSurveys} ${t('dashboard.participant.tiles.survey.done')}`
                                        : t('dashboard.participant.tiles.survey.noSurveys')
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
                                        ? t('dashboard.participant.tiles.survey.unavailable')
                                        : t('dashboard.participant.tiles.survey.completed')
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
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <h2 className="text-lg font-semibold theme-text-primary">
                            Workshop Use Cases ({sessionInfo?.use_cases.length || 0})
                        </h2>
                        {myUseCaseCount > 0 && (
                            <div role="group" aria-label="Filter use cases" className="flex gap-1 text-sm">
                                <button type="button" aria-pressed={!showOnlyMine} onClick={() => setShowOnlyMine(false)}
                                    className={`px-3 py-1 rounded-full ${!showOnlyMine ? 'bg-brand-violet text-white' : 'theme-bg-tertiary theme-text-secondary'}`}>
                                    All
                                </button>
                                <button type="button" aria-pressed={showOnlyMine} onClick={() => setShowOnlyMine(true)}
                                    className={`px-3 py-1 rounded-full ${showOnlyMine ? 'bg-brand-violet text-white' : 'theme-bg-tertiary theme-text-secondary'}`}>
                                    Mine ({myUseCaseCount})
                                </button>
                            </div>
                        )}
                    </div>

                    {(sessionInfo?.use_cases.length || 0) === 0 ? (
                        <p className="text-sm theme-text-secondary">
                            No use cases submitted yet. Be the first to add one!
                        </p>
                    ) : (
                        <div className="grid gap-3 max-h-96 overflow-y-auto">
                            {visibleUseCases.map((uc) => (
                                <button
                                    type="button"
                                    key={uc.id}
                                    className="text-left p-3 rounded-lg theme-bg-tertiary cursor-pointer hover:theme-bg-secondary transition-colors"
                                    onClick={() => setSelectedUseCase(uc)}
                                >
                                    <div className="flex items-center gap-2 font-medium text-sm theme-text-primary">
                                        <span className="flex-1">{uc.title}</span>
                                        {isMine(uc) && (
                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-violet/20 text-brand-violet">Mine · tap to edit</span>
                                        )}
                                    </div>
                                    {uc.description && (
                                        <div className="text-xs mt-1 line-clamp-1 theme-text-secondary">
                                            {uc.description}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* QA Modal - Uses dynamic theme colors */}
            {activeModal === 'qa' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-2xl h-[80vh] rounded-2xl overflow-hidden theme-bg-primary">
                        <button aria-label="Close"
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
                            aria-label="Close (your draft is saved)"
                            className="absolute top-4 right-4 z-10 p-2 rounded-lg transition theme-text-secondary hover:theme-bg-tertiary hover:theme-text-primary"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        {scoringStartedWhileWriting && (
                            <div role="alert" className="mx-4 mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm theme-text-primary">
                                <p className="font-medium">The facilitator has started scoring.</p>
                                <p className="mt-1 contrast-muted">Finish and submit your use case — your draft is saved — then you'll go to scoring.</p>
                                <button type="button" onClick={handleModalClose} className="mt-2 text-brand-violet underline">
                                    Go to scoring now (keep my draft)
                                </button>
                            </div>
                        )}
                        <UseCaseCanvas session={session} onSuccess={handleModalClose} onDirtyChange={handleDraftDirtyChange} />
                    </div>
                </div>
            )}

            {/* Survey Modal */}
            {activeModal === 'survey' && activeSurveyId && session?.participantId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 theme-card">
                        <button aria-label="Close"
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
            {activeModal === 'results' && session?.workshopId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="top-ideas-title">
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 theme-card">
                        <button
                            onClick={handleModalClose}
                            aria-label="Close"
                            className="absolute top-4 right-4 p-2 rounded-lg transition theme-text-secondary hover:theme-bg-tertiary hover:theme-text-primary"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2 id="top-ideas-title" className="text-xl font-bold theme-text-primary mb-4">Top use cases</h2>
                        <TopIdeas workshopId={session.workshopId} />
                    </div>
                </div>
            )}

            {activeModal === 'leaderboard' && session?.workshopId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 theme-card">
                        <button aria-label="Close"
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
                            <button aria-label="Close"
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
