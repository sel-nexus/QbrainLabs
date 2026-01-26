import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { ResultsChart } from '../components/ResultsChart';
import { UseCaseCanvas } from '../components/UseCaseCanvas';
import { Button } from '../components/ui/Button';
import { LogOut, ArrowLeft, Loader2, GripVertical, Plus, X, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../components/Header';

export function ParticipantMatrix() {
    const navigate = useNavigate();
    const { } = useTheme();
    const { session } = useSession();
    const [results, setResults] = useState<any[]>([]);
    const [useCases, setUseCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [workshopTitle, setWorkshopTitle] = useState<string>('');
    const [draggedItem, setDraggedItem] = useState<any>(null);
    const [showUseCaseModal, setShowUseCaseModal] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
    const matrixRef = useRef<HTMLDivElement>(null);

    const handleSaveChanges = async () => {
        if (unsavedChanges.size === 0) return;

        setIsSaving(true);
        try {
            const promises = Array.from(unsavedChanges).map(async (id) => {
                const item = results.find(r => r.id === id);
                if (!item) return;

                // Save to DB
                await api.post('/votes/', {
                    use_case_id: id,
                    participant_id: session?.participantId,
                    scores: {
                        'Feasibility': Math.round(item.x),
                        'Business Value': Math.round(item.y)
                    }
                });

                // Emit socket event
                if (session?.participantId && session?.workshopId) {
                    socket.emit('matrix:position_update', {
                        participant_id: session.participantId,
                        participant_name: session.name || 'Participant',
                        use_case_id: id,
                        use_case_title: item.title,
                        position: { x: item.x, y: item.y },
                        workshop_id: session.workshopId
                    });
                }
            });

            await Promise.all(promises);
            setUnsavedChanges(new Set());
            toast.success("All changes submitted successfully!");
        } catch (err: any) {
            console.error('Failed to save changes:', err);
            toast.error("Failed to submit changes. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (!session) {
            navigate('/');
            return;
        }

        // Join workshop room to receive socket events
        if (session.workshopId) {
            socket.emit('join_workshop', { workshop_id: session.workshopId });
        }

        fetchMatrixData();

        // Listen for new use case additions
        const handleNewSubmission = (data: any) => {
            console.log('New use case submission received:', data);
            // Only refresh use cases list, NOT results (so it doesn't appear on graph automatically)
            // Refresh use cases to show the new one in the tiles panel
            api.get(`/usecases/${session.workshopId}`)
                .then(response => {
                    setUseCases(response.data || []);
                })
                .catch(err => {
                    console.error('Failed to refresh use cases:', err);
                });

            setShowUseCaseModal(false); // Close the modal
            toast.success(`"${data.title}" added! Drag it from the panel onto the matrix to position it.`);
        };

        socket.on('new_submission', handleNewSubmission);

        // Listen for position changes from ResultsChart drag events
        const handlePositionChange = (e: any) => {
            const { id, x, y, scores } = e.detail;

            // Update local state immediately
            setResults(prevResults => {
                const existingIndex = prevResults.findIndex(r => r.id === id);
                const updatedResult = {
                    ...(prevResults.find(r => r.id === id) || {}),
                    id,
                    x,
                    y,
                    scores: scores || {
                        'Feasibility': x,
                        'Business Value': y
                    }
                };

                if (existingIndex >= 0) {
                    const updated = [...prevResults];
                    updated[existingIndex] = { ...updated[existingIndex], ...updatedResult };
                    return updated;
                }
                return prevResults;
            });

            // Mark as unsaved
            setUnsavedChanges(prev => new Set(prev).add(id));
        };

        const matrixContainer = matrixRef.current;
        if (matrixContainer) {
            matrixContainer.addEventListener('matrix:position_changed', handlePositionChange as EventListener);
            matrixContainer.addEventListener('matrix:position_removed', ((e: CustomEvent) => {
                handleRemovePosition(e.detail.id);
            }) as EventListener);
        }

        return () => {
            if (matrixContainer) {
                matrixContainer.removeEventListener('matrix:position_changed', handlePositionChange as EventListener);
                matrixContainer.removeEventListener('matrix:position_removed', ((e: CustomEvent) => {
                    handleRemovePosition(e.detail.id);
                }) as EventListener);
            }
            socket.off('new_submission', handleNewSubmission);
        };
    }, [session, navigate]);

    const handleRemovePosition = async (useCaseId: string) => {
        if (!session?.participantId || !session?.workshopId) return;

        // Optimistically remove from UI
        setResults(prev => prev.filter(r => r.id !== useCaseId));
        setUnsavedChanges(prev => {
            const next = new Set(prev);
            next.delete(useCaseId);
            return next;
        });

        try {
            await api.delete('/votes/', {
                params: {
                    use_case_id: useCaseId,
                    participant_id: session.participantId
                }
            });
            toast.success("Removed from matrix");
        } catch (err) {
            console.error('Failed to remove position:', err);
            toast.error("Failed to remove. Please try again.");
            fetchMatrixData(); // Revert on failure
        }
    };

    const fetchMatrixData = async () => {
        if (!session?.workshopId) return;

        try {
            setLoading(true);
            // Fetch workshop info
            const workshopResponse = await api.get(`/workshops/${session.workshopId}`);
            setWorkshopTitle(workshopResponse.data?.title || 'Workshop');

            // Fetch use cases
            const useCasesResponse = await api.get(`/usecases/${session.workshopId}`);
            setUseCases(useCasesResponse.data || []);

            // Fetch participant-specific matrix positions (their own positions, not aggregated)
            // This ensures positions are tracked per participant and don't change when others vote
            try {
                const positionsResponse = await api.get(
                    `/votes/participant/${session.participantId}/matrix-positions?workshop_id=${session.workshopId}`
                );
                const participantPositions = positionsResponse.data || [];

                // Map to results format
                const positionedResults = participantPositions.map((pos: any) => ({
                    id: pos.id,
                    title: pos.title,
                    description: pos.description,
                    category: pos.category,
                    x: pos.x,
                    y: pos.y,
                    scores: pos.scores,
                    vote_count: pos.vote_count || 1,
                    variance: pos.variance || 0
                }));

                setResults(positionedResults);
            } catch (err: any) {
                // If endpoint doesn't exist yet (404), fall back to fetching participant's votes directly
                if (err.response?.status === 404) {
                    console.warn('Participant matrix positions endpoint not available, using fallback');
                    // Fallback: We'll rely on local state and API saves
                    // Positions are saved via POST /votes/ and stored in database
                    // They will be loaded from local state updates
                    setResults([]);
                } else {
                    console.error('Failed to fetch participant positions:', err);
                    toast.error(`Error loading matrix: ${err.message || 'Unknown error'}`);
                    setResults([]);
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch matrix data:', err);
            toast.error('Failed to load matrix data');
        } finally {
            setLoading(false);
        }
    };

    const [activeQuadrant, setActiveQuadrant] = useState<string | null>(null);
    const [lastDroppedQuadrant, setLastDroppedQuadrant] = useState<string | null>(null);

    // Helper to determine quadrant from domain coordinates
    const getQuadrant = (x: number, y: number) => {
        const mid = 50;
        if (x < mid && y > mid) return 'top-left';
        if (x >= mid && y > mid) return 'top-right';
        if (x < mid && y <= mid) return 'bottom-left';
        if (x >= mid && y <= mid) return 'bottom-right';
        return null;
    };

    const handleDragStart = (e: React.DragEvent, useCase: any) => {
        if (!session?.participantId) {
            e.preventDefault();
            toast.error('Session expired. Please refresh the page.');
            return;
        }

        setDraggedItem(useCase);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', useCase.id);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }

        // Emit drag start event for real-time tracking
        if (session?.participantId && session?.workshopId) {
            socket.emit('matrix:drag_start', {
                participant_id: session.participantId,
                participant_name: session.name || 'Participant',
                use_case_id: useCase.id,
                use_case_title: useCase.title,
                workshop_id: session.workshopId
            });
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
        setDraggedItem(null);
        setIsDraggingOver(false);
        setActiveQuadrant(null);
    };

    const getMatrixCoordinates = (e: React.DragEvent) => {
        if (!matrixRef.current) return null;

        const svg = matrixRef.current.querySelector('svg');
        if (!svg) return null;

        const svgRect = svg.getBoundingClientRect();
        const x = e.clientX - svgRect.left;
        const y = e.clientY - svgRect.top;

        // Matrix dimensions from ResultsChart component
        const matrixWidth = 800;
        const matrixHeight = 600;
        const margin = { left: 60, top: 40, right: 40, bottom: 60 };
        const plotWidth = matrixWidth - margin.left - margin.right;
        const plotHeight = matrixHeight - margin.top - margin.bottom;

        const scaleX = svgRect.width / matrixWidth;
        const scaleY = svgRect.height / matrixHeight;

        const adjustedX = x / scaleX;
        const adjustedY = y / scaleY;

        if (adjustedX >= margin.left && adjustedX <= margin.left + plotWidth &&
            adjustedY >= margin.top && adjustedY <= margin.top + plotHeight) {

            const domainX = Math.max(0, Math.min(100, ((adjustedX - margin.left) / plotWidth) * 100));
            // Y axis is inverted in D3 (0 is bottom of graph, which is top of SVG usually? No wait)
            // In D3 scale: range([height, 0]). 
            // pixel y=0 -> domain=100. pixel y=height -> domain=0.
            // ((adjustedY - margin.top) / plotHeight) gives 0 at top, 1 at bottom.
            // So domainY = (1 - ratio) * 100.
            // Let's verify ResultsChart.tsx:
            // const y = d3.scaleLinear().domain([0, domainMax]).range([height, 0]);
            // pixel = y(val). 
            // input pixel -> invert.
            // y.invert(pixel_y).
            // Math: pixel_y / height = 0..1 (top to bottom).
            // domain = domainMax * (1 - pixel_y_ratio).

            const ratioY = (adjustedY - margin.top) / plotHeight;
            const domainY = Math.max(0, Math.min(100, (1 - ratioY) * 100));

            return { domainX, domainY };
        }
        return null;
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false);
        setActiveQuadrant(null);

        if (!draggedItem || !matrixRef.current || !session?.participantId) {
            if (!session?.participantId) {
                toast.error('Session expired. Please refresh the page.');
            }
            return;
        }

        const coords = getMatrixCoordinates(e);

        if (coords) {
            const { domainX, domainY } = coords;

            // Determine quadrant
            const quadrant = getQuadrant(domainX, domainY);
            setLastDroppedQuadrant(quadrant);

            // Update local state state to reflect the new position
            const newResult = {
                ...draggedItem,
                id: draggedItem.id,
                title: draggedItem.title,
                description: draggedItem.description,
                x: domainX,
                y: domainY,
                scores: {
                    'Feasibility': domainX,
                    'Business Value': domainY
                },
                vote_count: 1,
                variance: 0
            };

            setResults(prevResults => {
                const existingIndex = prevResults.findIndex(r => r.id === draggedItem.id);
                if (existingIndex >= 0) {
                    // Update existing position
                    const updatedResults = [...prevResults];
                    updatedResults[existingIndex] = newResult;
                    return updatedResults;
                } else {
                    // Add new use case to graph
                    return [...prevResults, newResult];
                }
            });

            // Mark as unsaved
            setUnsavedChanges(prev => new Set(prev).add(draggedItem.id));
            toast.info(`Placed "${draggedItem.title}". Click Submit to save.`);

        } else {
            toast.error('Please drop within the matrix plot area');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDraggingOver(true);

        // Calculate active quadrant
        const coords = getMatrixCoordinates(e);
        if (coords) {
            const quadrant = getQuadrant(coords.domainX, coords.domainY);
            if (activeQuadrant !== quadrant) {
                setActiveQuadrant(quadrant);
            }
        } else {
            setActiveQuadrant(null);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only set dragging over to false if we're leaving the matrix container
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (!matrixRef.current?.contains(relatedTarget)) {
            setIsDraggingOver(false);
        }
    };

    const handleLeave = () => {
        if (confirm("Are you sure you want to leave?")) {
            navigate('/participant-dashboard');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center theme-bg-primary">
                <div className="flex items-center gap-3 theme-text-secondary">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Loading matrix...</span>
                </div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen theme-bg-primary">
            <Header showBackButton={false} showHomeButton={false} />
            {/* Header */}
            <header className="sticky top-14 z-40 border-b backdrop-blur theme-bg-secondary/80 theme-border">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/participant-dashboard')}
                            className="theme-text-secondary hover:theme-text-primary"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold theme-text-primary">
                                Strategic Matrix
                            </h1>
                            <p className="text-sm theme-text-secondary">
                                {workshopTitle}
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" onClick={handleLeave} className="theme-text-secondary hover:theme-text-primary">
                        <LogOut className="w-4 h-4 mr-2" />
                        Leave
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {useCases.length === 0 ? (
                    <div className="text-center py-20 theme-text-secondary">
                        <div className="text-6xl mb-4">📊</div>
                        <p className="text-lg mb-2 font-semibold">No use cases available yet</p>
                        <p className="text-sm mb-6">
                            Use cases need to be added before they can be positioned on the matrix.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="secondary"
                                onClick={() => setShowUseCaseModal(true)}
                                className="flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add First Use Case
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/participant-dashboard')}
                            >
                                Go to Dashboard
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6">
                        {/* Matrix Section - Left Side (70%) */}
                        <div className="p-6 rounded-xl border theme-card theme-border">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-semibold theme-text-primary">
                                    Strategic Prioritization Matrix
                                </h2>
                                <Button
                                    onClick={handleSaveChanges}
                                    disabled={unsavedChanges.size === 0 || isSaving}
                                    className={`transition-all ${unsavedChanges.size > 0 ? 'animate-pulse' : ''}`}
                                    variant={unsavedChanges.size > 0 ? 'primary' : 'secondary'}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Submit Positions ({unsavedChanges.size})
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs mb-4 theme-text-secondary">
                                Drag use cases from the right panel onto the matrix to position them.
                                Drag a dot outside the matrix box to remove it.
                            </p>
                            <div
                                ref={matrixRef}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                className={`relative transition-all ${isDraggingOver && draggedItem
                                    ? 'ring-2 ring-brand-violet ring-offset-2 ring-offset-surface-800'
                                    : ''
                                    }`}
                                role="application"
                                aria-label="Strategic Prioritization Matrix - Drop use cases here to position them"
                            >
                                {isDraggingOver && draggedItem && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-brand-violet/10 border-2 border-dashed border-brand-violet rounded-lg pointer-events-none">
                                        <div className="bg-surface-800 px-4 py-2 rounded-lg border border-brand-violet">
                                            <p className="text-sm font-semibold text-brand-violet">
                                                Drop "{draggedItem.title}" here to position
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {isSaving && (
                                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 rounded-lg pointer-events-none">
                                        <div className="bg-surface-800 px-4 py-2 rounded-lg border border-white/20 flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-brand-violet" />
                                            <span className="text-sm text-white">Saving position...</span>
                                        </div>
                                    </div>
                                )}
                                <ResultsChart
                                    data={results}
                                    showLabels={true}
                                    activeQuadrant={activeQuadrant}
                                    highlightQuadrant={lastDroppedQuadrant}
                                />
                            </div>
                        </div>

                        {/* Use Cases Tiles - Right Side (30%) */}
                        <div className="p-4 rounded-xl border theme-card theme-border">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold theme-text-primary">
                                    Use Cases ({useCases.length})
                                </h3>
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowUseCaseModal(true)}
                                    className="h-7 px-3 text-xs"
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add New
                                </Button>
                            </div>
                            <p className="text-xs mb-4 theme-text-secondary">
                                Drag tiles onto the matrix to position them
                            </p>
                            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                                {useCases.length === 0 ? (
                                    <div className="text-center py-8 theme-text-secondary">
                                        <p className="text-sm">No use cases available</p>
                                    </div>
                                ) : (
                                    useCases.map((uc: any) => {
                                        const isOnMatrix = results.some(r => r.id === uc.id);
                                        const isDragging = draggedItem?.id === uc.id;
                                        return (
                                            <div
                                                key={uc.id}
                                                draggable={!isSaving}
                                                onDragStart={(e) => handleDragStart(e, uc)}
                                                onDragEnd={handleDragEnd}
                                                className={`p-3 rounded-lg border transition-all ${isSaving ? 'cursor-not-allowed opacity-50' : 'cursor-move'
                                                    } theme-bg-tertiary theme-border hover:border-brand-violet hover:shadow-lg ${isOnMatrix ? 'ring-2 ring-brand-violet/30' : ''
                                                    } ${isDragging ? 'opacity-50 scale-95' : ''
                                                    }`}
                                                aria-label={`Drag ${uc.title} onto matrix to position`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <GripVertical className="w-4 h-4 mt-0.5 flex-shrink-0 theme-text-secondary" />
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-sm mb-1 line-clamp-2 theme-text-primary">
                                                            {uc.title}
                                                        </h4>
                                                        {uc.description && (
                                                            <p className="text-xs line-clamp-2 theme-text-secondary">
                                                                {uc.description}
                                                            </p>
                                                        )}
                                                        {isOnMatrix && (
                                                            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t theme-border theme-text-secondary">
                                                                <span className="text-brand-violet flex items-center gap-1">
                                                                    ✓ On matrix
                                                                </span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm("Remove this use case from the matrix?")) {
                                                                            handleRemovePosition(uc.id);
                                                                        }
                                                                    }}
                                                                    className="p-1.5 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded transition-colors"
                                                                    title="Remove from matrix"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Use Case Creation Modal */}
            {showUseCaseModal && session && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl theme-bg-primary">
                        <button
                            onClick={() => setShowUseCaseModal(false)}
                            className="absolute top-4 right-4 z-10 p-2 rounded-lg transition theme-text-secondary hover:theme-bg-tertiary hover:theme-text-primary"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <UseCaseCanvas
                            session={session}
                            onSuccess={() => {
                                setShowUseCaseModal(false);
                                // Only refresh use cases list, not matrix positions
                                // Matrix positions remain unchanged until participant drags new items
                                api.get(`/usecases/${session.workshopId}`)
                                    .then(response => {
                                        setUseCases(response.data || []);
                                    })
                                    .catch(err => {
                                        console.error('Failed to refresh use cases:', err);
                                    });
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
