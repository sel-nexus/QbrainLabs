import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Loader2, X, RotateCcw, GripVertical, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../components/Header';
import { PrioritizationScale } from '../components/prioritization/PrioritizationScale';

export function ParticipantMatrix() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { session } = useSession();

    // Original use cases from workshop
    const [useCases, setUseCases] = useState<any[]>([]);

    // Scores mapping: useCaseId -> { criterionName -> score }
    const [scores, setScores] = useState<Record<string, Record<string, number>>>({});

    const [loading, setLoading] = useState(true);
    const [workshopTitle, setWorkshopTitle] = useState<string>('');
    const [workshopCriteria, setWorkshopCriteria] = useState<any[]>([]);
    const [activeCriterionIndex, setActiveCriterionIndex] = useState(0);

    // Persist active criterion to sessionStorage
    useEffect(() => {
        if (!session?.workshopId) return;

        const saved = sessionStorage.getItem(`active_criterion_${session.workshopId}`);
        if (saved) {
            const index = parseInt(saved, 10);
            if (!isNaN(index) && index < workshopCriteria.length) {
                setActiveCriterionIndex(index);
            }
        }
    }, [session?.workshopId, workshopCriteria.length]);

    useEffect(() => {
        if (session?.workshopId) {
            sessionStorage.setItem(`active_criterion_${session.workshopId}`, activeCriterionIndex.toString());
        }
    }, [activeCriterionIndex, session?.workshopId]);

    const [isSaving, setIsSaving] = useState(false);
    // Number of autosaves in flight (each rating saves immediately).
    const [pendingSaves, setPendingSaves] = useState(0);
    const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
    const [mobileItemsExpanded, setMobileItemsExpanded] = useState(true);
    const [mobileRatedExpanded, setMobileRatedExpanded] = useState(false);
    const [mobileScoreTarget, setMobileScoreTarget] = useState<any | null>(null);
    const criteriaScrollRef = useRef<HTMLDivElement>(null);

    const activeCriterion = workshopCriteria[activeCriterionIndex]?.name;

    const handleSaveChanges = async () => {
        if (unsavedChanges.size === 0) return;

        setIsSaving(true);
        try {
            const promises = Array.from(unsavedChanges).map(async (id) => {
                const itemScores = scores[id];
                if (!itemScores) return;

                // Save to DB
                await api.post('votes/', {
                    use_case_id: id,
                    participant_id: session?.participantId,
                    scores: itemScores
                });

                // Emit socket event for real-time facilitator view
                if (session?.participantId && session?.workshopId) {
                    const useCase = useCases.find(u => u.id === id);
                    socket.emit('matrix:position_update', {
                        participant_id: session.participantId,
                        participant_name: session.name || 'Participant',
                        use_case_id: id,
                        use_case_title: useCase?.title || 'Unknown',
                        scores: itemScores,
                        workshop_id: session.workshopId
                    });
                }
            });

            await Promise.all(promises);
            setUnsavedChanges(new Set());
            setLastSaved(new Date());
            toast.success("All changes saved");
        } catch (err: any) {
            console.error('Failed to save changes:', err);
            toast.error("Some ratings could not be saved. Check your connection and tap Retry.");
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (!session) {
            console.log('[ParticipantMatrix] No session, redirecting to home');
            navigate('/');
            return;
        }

        console.log('[ParticipantMatrix] Component mounted with session:', {
            participantId: session.participantId,
            workshopId: session.workshopId
        });

        if (session.workshopId) {
            socket.emit('join_workshop', { workshop_id: session.workshopId });
        }

        fetchMatrixData();

        const handleNewSubmission = (data: any) => {
            api.get(`usecases/${session.workshopId}`)
                .then(response => {
                    setUseCases(response.data || []);
                })
                .catch(err => {
                    console.error('Failed to refresh use cases:', err);
                });

            toast.success(`"${data.title}" added! Drag it to the scale to rate it.`);
        };

        socket.on('new_submission', handleNewSubmission);

        return () => {
            socket.off('new_submission', handleNewSubmission);
        };
    }, [session, navigate]);

    const fetchMatrixData = async () => {
        if (!session?.workshopId || !session?.participantId) {
            console.warn('[ParticipantMatrix] Cannot fetch data - missing session info:', {
                hasWorkshopId: !!session?.workshopId,
                hasParticipantId: !!session?.participantId
            });
            return;
        }

        console.log('[ParticipantMatrix] Fetching matrix data for:', {
            workshopId: session.workshopId,
            participantId: session.participantId
        });

        try {
            setLoading(true);
            const workshopResponse = await api.get(`workshops/${session.workshopId}`);
            setWorkshopTitle(workshopResponse.data?.title || 'Workshop');
            setWorkshopCriteria(workshopResponse.data?.config?.criteria || []);

            const useCasesResponse = await api.get(`usecases/${session.workshopId}`);
            setUseCases(useCasesResponse.data || []);

            try {
                console.log('[ParticipantMatrix] Fetching participant positions...');
                const positionsResponse = await api.get(
                    `votes/participant/${session.participantId}/matrix-positions?workshop_id=${session.workshopId}`
                );
                const participantPositions = positionsResponse.data || [];

                const loadedScores: Record<string, Record<string, number>> = {};
                participantPositions.forEach((pos: any) => {
                    loadedScores[pos.id] = pos.scores;
                });
                console.log('[ParticipantMatrix] Loaded scores from backend:', loadedScores);
                console.log('[ParticipantMatrix] Participant positions:', participantPositions);

                // If we got empty data but expected some, try one more time after a delay
                if (participantPositions.length === 0 && Object.keys(scores).length > 0) {
                    console.log('[ParticipantMatrix] Got empty data but had previous scores, retrying in 500ms...');
                    await new Promise(resolve => setTimeout(resolve, 500));

                    const retryResponse = await api.get(
                        `votes/participant/${session.participantId}/matrix-positions?workshop_id=${session.workshopId}`
                    );
                    const retryPositions = retryResponse.data || [];

                    if (retryPositions.length > 0) {
                        console.log('[ParticipantMatrix] Retry successful, got', retryPositions.length, 'positions');
                        const retryScores: Record<string, Record<string, number>> = {};
                        retryPositions.forEach((pos: any) => {
                            retryScores[pos.id] = pos.scores;
                        });
                        setScores(retryScores);
                        return;
                    }
                }

                setScores(loadedScores);
            } catch (err: any) {
                console.warn('Failed to fetch participant positions:', err);
                console.warn('Error details:', err.response?.data || err.message);
                setScores({});
            }
        } catch (err: any) {
            console.error('Failed to fetch matrix data:', err);
            toast.error('Failed to load matrix data');
        } finally {
            setLoading(false);
        }
    };

    const handleScoreChange = (useCaseId: string, score: number) => {
        if (!activeCriterion) return;

        setScores(prev => {
            const newScores = {
                ...prev,
                [useCaseId]: {
                    ...(prev[useCaseId] || {}),
                    [activeCriterion]: score
                }
            };
            return newScores;
        });

        setUnsavedChanges(prev => new Set(prev).add(useCaseId));

        // Pass the updated scores directly to avoid race conditions with state
        const updatedScores = {
            ...(scores[useCaseId] || {}),
            [activeCriterion]: score
        };
        saveSpecificUseCase(useCaseId, updatedScores);
    };

    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const saveSpecificUseCase = async (useCaseId: string, itemScores: Record<string, number>) => {
        if (!session?.participantId) {
            console.warn('[ParticipantMatrix] Cannot save - no participant ID');
            return;
        }
        const useCase = useCases.find(u => u.id === useCaseId);

        setPendingSaves((n) => n + 1);
        try {
            console.log('[ParticipantMatrix] Auto-saving scores:', {
                use_case_id: useCaseId,
                participant_id: session.participantId,
                scores: itemScores
            });
            await api.post('votes/', {
                use_case_id: useCaseId,
                participant_id: session.participantId,
                scores: itemScores
            });
            console.log('[ParticipantMatrix] Auto-save successful for:', useCaseId);

            setUnsavedChanges(prev => {
                const next = new Set(prev);
                next.delete(useCaseId);
                return next;
            });
            setLastSaved(new Date());

            socket.emit('matrix:position_update', {
                participant_id: session.participantId,
                participant_name: session.name || 'Participant',
                use_case_id: useCaseId,
                use_case_title: useCase?.title || 'Unknown',
                scores: itemScores,
                workshop_id: session.workshopId
            });
        } catch (err) {
            console.error('Auto-save failed:', err);
            // The item stays in unsavedChanges, so the header shows "Not saved — Retry".
            toast.error("Couldn't save your rating. Tap Retry at the top when you're back online.", { id: 'matrix-save-failed' });
        } finally {
            setPendingSaves((n) => Math.max(0, n - 1));
        }
    };

    const handleRemoveRating = (useCaseId: string) => {
        if (!activeCriterion) return;

        setScores(prev => {
            if (!prev[useCaseId]) return prev;
            const updatedItemScores = { ...prev[useCaseId] };
            delete updatedItemScores[activeCriterion];

            const newScores = { ...prev };
            if (Object.keys(updatedItemScores).length === 0) {
                delete newScores[useCaseId];
            } else {
                newScores[useCaseId] = updatedItemScores;
            }
            return newScores;
        });

        setUnsavedChanges(prev => new Set(prev).add(useCaseId));

        const updatedItemScores = { ...(scores[useCaseId] || {}) };
        delete updatedItemScores[activeCriterion];

        saveSpecificUseCase(useCaseId, updatedItemScores);
    };

    const handleDragStart = (e: React.DragEvent, useCase: any) => {
        e.dataTransfer.setData('text/plain', useCase.id);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center theme-bg-primary">
                <div className="flex items-center gap-3 theme-text-secondary">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Loading prioritization...</span>
                </div>
            </div>
        );
    }

    const pendingUseCases = useCases.filter(uc => !scores[uc.id]?.[activeCriterion]);
    const ratedUseCases = useCases.filter(uc => scores[uc.id]?.[activeCriterion]);
    const scale = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    const handleMobileScoreSelect = (score: number) => {
        if (!mobileScoreTarget) return;
        handleScoreChange(mobileScoreTarget.id, score);
        setMobileScoreTarget(null);
    };

    return (
        <div className="min-h-screen theme-bg-primary pt-[64px]">
            <Header showBackButton={false} showHomeButton={false} />

            {/* Sticky Header — responsive */}
            <header className="sticky top-[64px] z-40 border-b backdrop-blur theme-bg-secondary/80 theme-border">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-4">
                    {/* Row 1: Back + Title + Submit */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                            <button
                                onClick={() => navigate('/participant-dashboard')}
                                className="p-1.5 sm:p-2 rounded-lg theme-text-secondary hover:theme-text-primary hover:bg-black/5 transition shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-sm sm:text-xl font-bold theme-text-primary truncate">
                                    Strategic Prioritization
                                </h1>
                                <p className="text-[10px] sm:text-sm theme-text-secondary truncate">
                                    {workshopTitle}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {/* Ratings save automatically; this shows where that stands. */}
                            <div role="status" aria-live="polite" className="flex items-center">
                                {isSaving || pendingSaves > 0 ? (
                                    <span className="flex items-center gap-1 text-xs theme-text-muted">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Saving…
                                    </span>
                                ) : unsavedChanges.size > 0 ? (
                                    <Button
                                        onClick={handleSaveChanges}
                                        variant="primary"
                                        className="text-xs sm:text-sm !px-2.5 sm:!px-4 !py-1.5 sm:!py-2"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                                        Not saved — Retry ({unsavedChanges.size})
                                    </Button>
                                ) : lastSaved ? (
                                    <span className="flex items-center gap-1 text-xs theme-text-muted">
                                        <Check className="w-3.5 h-3.5 text-semantic-success" aria-hidden="true" /> All changes saved
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile: Horizontal criteria tabs */}
            <div className="lg:hidden sticky top-[112px] sm:top-[128px] z-30 border-b theme-border backdrop-blur theme-bg-secondary/90">
                <div className="px-3 py-2">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary shrink-0">
                            Category
                        </span>
                        <span className="text-[10px] theme-text-muted">
                            {activeCriterionIndex + 1}/{workshopCriteria.length}
                        </span>
                    </div>
                    <div ref={criteriaScrollRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                        {workshopCriteria.map((criterion, idx) => {
                            const isSelected = activeCriterionIndex === idx;
                            const pendingCount = useCases.filter(uc => !scores[uc.id]?.[criterion.name]).length;
                            const isCompleted = pendingCount === 0 && useCases.length > 0;

                            return (
                                <button
                                    key={criterion.name}
                                    onClick={() => setActiveCriterionIndex(idx)}
                                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1.5 ${isSelected
                                        ? 'bg-brand-violet text-white shadow-md'
                                        : isCompleted
                                            ? 'bg-semantic-success/10 text-semantic-success border border-semantic-success/30'
                                            : 'theme-bg-tertiary theme-text-secondary border theme-border'
                                        }`}
                                >
                                    {criterion.name}
                                    {isCompleted ? (
                                        <Check className="w-3 h-3" />
                                    ) : pendingCount > 0 && !isSelected ? (
                                        <span className="bg-brand-violet/20 text-brand-violet text-[9px] px-1 rounded-full font-bold">
                                            {pendingCount}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <main className="max-w-[1600px] mx-auto px-3 sm:px-4 py-4 sm:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_300px] gap-4 sm:gap-8 items-start">

                    {/* Left Sidebar: Category Navigation — desktop only */}
                    <aside className="hidden lg:block space-y-4 sticky top-[140px] z-30">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="font-bold theme-text-secondary text-xs uppercase tracking-wider">
                                Categories
                            </h3>
                            <span className="text-[10px] bg-theme-bg-tertiary px-2 py-0.5 rounded-full theme-text-muted">
                                {activeCriterionIndex + 1} / {workshopCriteria.length}
                            </span>
                        </div>

                        <div className="flex flex-col gap-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 scrollbar-hide">
                            {workshopCriteria.length === 0 ? (
                                <div className="text-center py-8 rounded-2xl border-2 border-dashed theme-border theme-bg-secondary">
                                    <p className="text-xs theme-text-secondary italic px-4">
                                        No prioritization criteria defined.
                                    </p>
                                </div>
                            ) : (
                                workshopCriteria.map((criterion, idx) => {
                                    const isSelected = activeCriterionIndex === idx;
                                    const pendingCount = useCases.filter(uc => !scores[uc.id]?.[criterion.name]).length;
                                    const isCompleted = pendingCount === 0 && useCases.length > 0;

                                    return (
                                        <button
                                            key={criterion.name}
                                            onClick={() => setActiveCriterionIndex(idx)}
                                            className={`w-full p-4 rounded-xl border transition-all flex flex-col gap-2 group relative text-left ${isSelected
                                                ? 'border-brand-violet bg-brand-violet/10 ring-2 ring-brand-violet/20 shadow-lg z-10'
                                                : isCompleted
                                                    ? 'border-semantic-success bg-semantic-success/5 opacity-80'
                                                    : 'theme-border theme-bg-secondary hover:border-brand-violet/40 hover:bg-brand-violet/5'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={`text-xs font-bold uppercase tracking-wide truncate ${isSelected ? 'theme-text-primary' : isCompleted ? 'text-semantic-success' : 'theme-text-secondary'
                                                    }`}>
                                                    {criterion.name}
                                                </span>
                                                {isCompleted ? (
                                                    <div className="bg-semantic-success text-white p-0.5 rounded-full shrink-0">
                                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                ) : pendingCount > 0 && (
                                                    <span className="text-[10px] bg-brand-violet/20 text-brand-violet px-1.5 py-0.5 rounded-md font-bold">
                                                        {pendingCount}
                                                    </span>
                                                )}
                                            </div>

                                            {isSelected && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-violet rounded-r-full shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </aside>

                    {/* Center Section: Scale & Description */}
                    <div className="space-y-4 sm:space-y-6">
                        <div className="text-center bg-brand-violet/5 py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl border border-brand-violet/10 backdrop-blur-sm">
                            <h2 className="text-sm sm:text-lg font-bold theme-text-primary flex items-center justify-center gap-2">
                                <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-brand-violet text-white flex items-center justify-center text-xs sm:text-sm">
                                    {activeCriterionIndex + 1}
                                </span>
                                {workshopCriteria[activeCriterionIndex]?.name}
                            </h2>
                            {workshopCriteria[activeCriterionIndex]?.description && (
                                <p className="text-xs sm:text-sm theme-text-secondary mt-1.5 sm:mt-2 italic max-w-2xl mx-auto">
                                    &ldquo;{workshopCriteria[activeCriterionIndex].description}&rdquo;
                                </p>
                            )}
                        </div>

                        <div className="p-3 sm:p-6 rounded-xl sm:rounded-2xl border theme-card theme-border bg-white/50 backdrop-blur-sm shadow-xl">
                            <PrioritizationScale
                                criterion={activeCriterion}
                                useCases={useCases}
                                scores={scores}
                                onScoreChange={handleScoreChange}
                            />
                        </div>
                    </div>

                    {/* Right Sidebar — Desktop: sticky aside; Mobile: inline collapsible sections */}
                    <div className="lg:sticky lg:top-[140px] lg:z-30 space-y-4">

                        {/* Pending Items */}
                        <div>
                            <button
                                className="lg:pointer-events-none w-full flex items-center justify-between px-1 py-2 lg:py-0 lg:mb-0"
                                onClick={() => setMobileItemsExpanded(v => !v)}
                            >
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold theme-text-primary text-xs uppercase tracking-wider">
                                        Pending Items
                                    </h3>
                                    <span className="text-[10px] bg-brand-violet/10 text-brand-violet px-2 py-0.5 rounded-full font-bold">
                                        {pendingUseCases.length}
                                    </span>
                                </div>
                                <span className="lg:hidden theme-text-secondary">
                                    {mobileItemsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </span>
                            </button>

                            <div className={`space-y-2 sm:space-y-3 overflow-hidden transition-all lg:!max-h-none lg:!opacity-100 ${mobileItemsExpanded ? 'max-h-[2000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                                <div className="lg:max-h-[calc(100vh-450px)] lg:overflow-y-auto lg:pr-2 scrollbar-hide space-y-2 sm:space-y-3">
                                    {pendingUseCases.length === 0 && (
                                        <div className="text-center py-4 rounded-xl border-2 border-dashed theme-border theme-bg-secondary">
                                            <p className="text-xs theme-text-secondary">All items rated for this category</p>
                                        </div>
                                    )}
                                    {pendingUseCases.map((uc) => (
                                        <div
                                            key={uc.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, uc)}
                                            onClick={() => setMobileScoreTarget(uc)}
                                            className="p-3 sm:p-4 rounded-xl border theme-bg-secondary theme-border cursor-pointer sm:cursor-grab active:cursor-grabbing hover:border-brand-violet transition-all group shadow-sm hover:shadow-md active:scale-[0.98]"
                                        >
                                            <div className="flex gap-2 sm:gap-3">
                                                <GripVertical className="w-4 h-4 mt-0.5 opacity-20 group-hover:opacity-100 transition-opacity shrink-0 hidden sm:block" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-xs theme-text-primary line-clamp-1">{uc.title}</div>
                                                    <div className="text-[10px] theme-text-secondary line-clamp-2 mt-0.5 sm:mt-1">{uc.description}</div>
                                                </div>
                                                <span className="sm:hidden text-[10px] text-brand-violet font-semibold shrink-0 self-center">
                                                    Tap to rate
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Rated Items */}
                        <div className="pt-3 sm:pt-4 border-t theme-border">
                            <button
                                className="lg:pointer-events-none w-full flex items-center justify-between px-1 py-2 lg:py-0 lg:mb-3"
                                onClick={() => setMobileRatedExpanded(v => !v)}
                            >
                                <div className="flex items-center gap-2">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest theme-text-secondary">
                                        Rated Items
                                    </h4>
                                    {ratedUseCases.length > 0 && (
                                        <span className="text-[10px] bg-semantic-success/10 text-semantic-success px-2 py-0.5 rounded-full font-bold">
                                            {ratedUseCases.length}
                                        </span>
                                    )}
                                </div>
                                <span className="lg:hidden theme-text-secondary">
                                    {mobileRatedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </span>
                            </button>

                            <div className={`overflow-hidden transition-all lg:!max-h-none lg:!opacity-100 ${mobileRatedExpanded ? 'max-h-[2000px] opacity-100 mt-2' : 'max-h-0 opacity-0 lg:opacity-100'}`}>
                                <div className="space-y-2 lg:max-h-[300px] lg:overflow-y-auto lg:pr-2 scrollbar-hide">
                                    {ratedUseCases.map(uc => (
                                        <div key={uc.id} className="flex items-center justify-between p-2 rounded-lg bg-brand-violet/5 border border-brand-violet/20 group">
                                            <button
                                                type="button"
                                                onClick={() => setMobileScoreTarget(uc)}
                                                className="text-[11px] font-medium theme-text-primary truncate text-left flex-1 min-w-0 py-2"
                                                title="Change rating"
                                            >
                                                {uc.title}
                                            </button>
                                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                                <span className="text-[10px] font-black text-brand-violet bg-brand-violet/10 px-1.5 py-0.5 rounded">
                                                    {scores[uc.id][activeCriterion] === -1 ? 'Unsure' : scores[uc.id][activeCriterion]}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRating(uc.id)}
                                                    className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-100 hover:text-red-500 rounded transition-colors"
                                                    title="Remove rating"
                                                    aria-label={`Remove rating for ${uc.title}`}
                                                >
                                                    <X className="w-4 h-4" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Score Selector Modal */}
            {mobileScoreTarget && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
                    onClick={() => setMobileScoreTarget(null)}
                >
                    <div
                        className={`w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border overflow-hidden ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-4 pt-4 pb-2">
                            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden" />
                            <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                Rate: {mobileScoreTarget.title}
                            </h3>
                            {mobileScoreTarget.description && (
                                <p className={`text-xs mt-1 line-clamp-2 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {mobileScoreTarget.description}
                                </p>
                            )}
                            <p className={`text-[10px] mt-2 uppercase tracking-wider font-semibold ${theme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {activeCriterion}
                            </p>
                        </div>

                        <div className="px-4 py-3">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <span className="text-[10px] font-semibold theme-text-secondary uppercase">Low</span>
                                <span className="text-[10px] font-semibold theme-text-secondary uppercase">High</span>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {scale.map((num) => {
                                    const currentScore = scores[mobileScoreTarget.id]?.[activeCriterion];
                                    const isActive = currentScore !== undefined && currentScore > (num - 10) && currentScore <= num;
                                    return (
                                        <button
                                            key={num}
                                            onClick={() => handleMobileScoreSelect(num)}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all ${isActive
                                                ? 'bg-brand-violet text-white shadow-lg scale-105 ring-2 ring-brand-violet/40'
                                                : theme === 'light'
                                                    ? 'bg-gray-100 text-gray-700 hover:bg-brand-violet/10 hover:text-brand-violet active:scale-95'
                                                    : 'bg-surface-700 text-gray-300 hover:bg-brand-violet/20 hover:text-white active:scale-95'
                                                }`}
                                        >
                                            {num}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={`px-4 py-3 flex gap-2 border-t ${theme === 'light' ? 'border-gray-100' : 'border-white/5'}`}>
                            <button
                                onClick={() => handleMobileScoreSelect(-1)}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${theme === 'light'
                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-95'
                                    : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 active:scale-95'
                                    }`}
                            >
                                Unsure / Don&apos;t Know
                            </button>
                            <button
                                onClick={() => setMobileScoreTarget(null)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${theme === 'light'
                                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    : 'bg-surface-700 text-gray-400 hover:bg-surface-600'
                                    }`}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
