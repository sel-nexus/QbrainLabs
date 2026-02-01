import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Loader2, X, Save, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../components/Header';
import { PrioritizationScale } from '../components/prioritization/PrioritizationScale';

export function ParticipantMatrix() {
    const navigate = useNavigate();
    const { } = useTheme();
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
    const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());


    const activeCriterion = workshopCriteria[activeCriterionIndex]?.name;

    const handleSaveChanges = async () => {
        if (unsavedChanges.size === 0) return;

        setIsSaving(true);
        try {
            const promises = Array.from(unsavedChanges).map(async (id) => {
                const itemScores = scores[id];
                if (!itemScores) return;

                // Save to DB
                await api.post('/votes/', {
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
            toast.success("All ratings submitted successfully!");
        } catch (err: any) {
            console.error('Failed to save changes:', err);
            toast.error("Failed to submit changes. Please try again.");
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
            api.get(`/usecases/${session.workshopId}`)
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
            const workshopResponse = await api.get(`/workshops/${session.workshopId}`);
            setWorkshopTitle(workshopResponse.data?.title || 'Workshop');
            setWorkshopCriteria(workshopResponse.data?.config?.criteria || []);

            const useCasesResponse = await api.get(`/usecases/${session.workshopId}`);
            setUseCases(useCasesResponse.data || []);

            try {
                console.log('[ParticipantMatrix] Fetching participant positions...');
                const positionsResponse = await api.get(
                    `/votes/participant/${session.participantId}/matrix-positions?workshop_id=${session.workshopId}`
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
                        `/votes/participant/${session.participantId}/matrix-positions?workshop_id=${session.workshopId}`
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
        if (isSaving) {
            console.warn('[ParticipantMatrix] Skipping save - already saving');
            return;
        }

        const useCase = useCases.find(u => u.id === useCaseId);

        try {
            console.log('[ParticipantMatrix] Auto-saving scores:', {
                use_case_id: useCaseId,
                participant_id: session.participantId,
                scores: itemScores
            });
            await api.post('/votes/', {
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
            toast.error('Follow-up save failed. Please click "Submit" manually.');
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

    return (
        <div className="min-h-screen theme-bg-primary pt-[64px]">
            <Header showBackButton={false} showHomeButton={false} />

            <header className="sticky top-[64px] z-40 border-b backdrop-blur theme-bg-secondary/80 theme-border">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/participant-dashboard')}
                            className="theme-text-secondary hover:theme-text-primary"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold theme-text-primary">
                                Strategic Prioritization
                            </h1>
                            <p className="text-sm theme-text-secondary">
                                {workshopTitle}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {lastSaved && unsavedChanges.size === 0 && (
                            <span className="text-[10px] theme-text-muted flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-semantic-success" />
                                All changes saved
                            </span>
                        )}
                        <Button
                            onClick={handleSaveChanges}
                            disabled={unsavedChanges.size === 0 || isSaving}
                            variant={unsavedChanges.size > 0 ? 'primary' : 'secondary'}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {unsavedChanges.size > 0 ? `Submit (${unsavedChanges.size})` : 'Submitted'}
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_300px] gap-8 items-start">
                    {/* Left Sidebar: Category Navigation */}
                    <aside className="space-y-4 sticky top-[140px] z-30">
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
                    <div className="space-y-6">
                        <div className="text-center bg-brand-violet/5 py-4 px-6 rounded-2xl border border-brand-violet/10 backdrop-blur-sm">
                            <h2 className="text-lg font-bold theme-text-primary flex items-center justify-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-brand-violet text-white flex items-center justify-center text-sm">
                                    {activeCriterionIndex + 1}
                                </span>
                                {workshopCriteria[activeCriterionIndex]?.name}
                            </h2>
                            {workshopCriteria[activeCriterionIndex]?.description && (
                                <p className="text-sm theme-text-secondary mt-2 italic max-w-2xl mx-auto">
                                    &ldquo;{workshopCriteria[activeCriterionIndex].description}&rdquo;
                                </p>
                            )}
                        </div>

                        <div className="p-6 rounded-2xl border theme-card theme-border bg-white/50 backdrop-blur-sm shadow-xl">
                            <PrioritizationScale
                                criterion={activeCriterion}
                                useCases={useCases}
                                scores={scores}
                                onScoreChange={handleScoreChange}
                            />
                        </div>
                    </div>

                    {/* Right Sidebar: Pending Use Cases */}
                    <aside className="space-y-4 sticky top-[140px] z-30">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="font-bold theme-text-primary text-xs uppercase tracking-wider">
                                Pending Items
                            </h3>
                            <span className="text-[10px] bg-brand-violet/10 text-brand-violet px-2 py-0.5 rounded-full font-bold">
                                {useCases.filter(uc => !scores[uc.id]?.[activeCriterion]).length}
                            </span>
                        </div>

                        <div className="space-y-3 max-h-[calc(100vh-450px)] overflow-y-auto pr-2 scrollbar-hide">
                            {useCases.map((uc) => {
                                const isRated = !!scores[uc.id]?.[activeCriterion];
                                if (isRated) return null;

                                return (
                                    <div
                                        key={uc.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, uc)}
                                        className="p-4 rounded-xl border theme-bg-secondary theme-border cursor-grab active:cursor-grabbing hover:border-brand-violet transition-all group shadow-sm hover:shadow-md"
                                    >
                                        <div className="flex gap-3">
                                            <GripVertical className="w-4 h-4 mt-1 opacity-20 group-hover:opacity-100 transition-opacity shrink-0" />
                                            <div>
                                                <div className="font-semibold text-xs theme-text-primary line-clamp-1">{uc.title}</div>
                                                <div className="text-[10px] theme-text-secondary line-clamp-2 mt-1">{uc.description}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Rated in this category */}
                        <div className="pt-4 border-t theme-border">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest theme-text-secondary mb-3 px-1">
                                Rated Items
                            </h4>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                                {useCases.filter(uc => scores[uc.id]?.[activeCriterion]).map(uc => (
                                    <div key={uc.id} className="flex items-center justify-between p-2 rounded-lg bg-brand-violet/5 border border-brand-violet/20 group animate-in fade-in slide-in-from-right-2 duration-300">
                                        <div className="text-[11px] font-medium theme-text-primary truncate">{uc.title}</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-brand-violet bg-brand-violet/10 px-1.5 py-0.5 rounded">
                                                {scores[uc.id][activeCriterion]}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveRating(uc.id)}
                                                className="p-1 hover:bg-red-100 hover:text-red-500 rounded transition-colors"
                                                title="Remove Rating"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}
