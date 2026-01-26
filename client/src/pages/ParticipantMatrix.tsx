import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { ResultsChart } from '../components/ResultsChart';
import { UseCaseCanvas } from '../components/UseCaseCanvas';
import { Button } from '../components/ui/Button';
import { LogOut, ArrowLeft, Loader2, GripVertical, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../components/Header';

export function ParticipantMatrix() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { session, logout } = useSession();
    const [results, setResults] = useState<any[]>([]);
    const [useCases, setUseCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [workshopTitle, setWorkshopTitle] = useState<string>('');
    const [draggedItem, setDraggedItem] = useState<any>(null);
    const [showUseCaseModal, setShowUseCaseModal] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const matrixRef = useRef<HTMLDivElement>(null);

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
        const handlePositionChange = async (e: any) => {
            const { id, x, y, scores } = e.detail;
            
            // Save to API first (this persists to database)
            if (!session?.participantId) {
                toast.error('Session expired. Please refresh the page.');
                return;
            }

            setIsSaving(true);
            try {
                await api.post('/votes/', {
                    use_case_id: id,
                    participant_id: session.participantId,
                    scores: {
                        'Feasibility': Math.round(x),
                        'Business Value': Math.round(y)
                    }
                });
                
                // After successful save, update local state
                setResults(prevResults => {
                    const existingIndex = prevResults.findIndex(r => r.id === id);
                    const updatedResult = {
                        ...prevResults.find(r => r.id === id),
                        x,
                        y,
                        scores: scores || {
                            'Feasibility': x,
                            'Business Value': y
                        }
                    };

                    if (existingIndex >= 0) {
                        const updated = [...prevResults];
                        updated[existingIndex] = updatedResult;
                        return updated;
                    } else {
                        return [...prevResults, updatedResult];
                    }
                });
            } catch (err: any) {
                console.error('Failed to save position:', err);
                const errorMessage = err.response?.data?.detail || err.message || 'Failed to save position';
                toast.error(`Failed to save position: ${errorMessage}. Please try again.`);
            } finally {
                setIsSaving(false);
            }
        };

        const matrixContainer = matrixRef.current;
        if (matrixContainer) {
            matrixContainer.addEventListener('matrix:position_changed', handlePositionChange as EventListener);
        }

        return () => {
            if (matrixContainer) {
                matrixContainer.removeEventListener('matrix:position_changed', handlePositionChange as EventListener);
            }
            socket.off('new_submission', handleNewSubmission);
        };
    }, [session, navigate]);

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
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false);
        
        if (!draggedItem || !matrixRef.current || !session?.participantId) {
            if (!session?.participantId) {
                toast.error('Session expired. Please refresh the page.');
            }
            return;
        }

        // Find the SVG element within the matrix container
        const svg = matrixRef.current.querySelector('svg');
        if (!svg) {
            toast.error('Matrix not ready. Please wait a moment and try again.');
            return;
        }

        setIsSaving(true);

        const svgRect = svg.getBoundingClientRect();
        const x = e.clientX - svgRect.left;
        const y = e.clientY - svgRect.top;

        // Matrix dimensions from ResultsChart component
        const matrixWidth = 800;
        const matrixHeight = 600;
        const margin = { left: 60, top: 40, right: 40, bottom: 60 };
        const plotWidth = matrixWidth - margin.left - margin.right;
        const plotHeight = matrixHeight - margin.top - margin.bottom;

        // Scale factor if SVG is scaled
        const scaleX = svgRect.width / matrixWidth;
        const scaleY = svgRect.height / matrixHeight;

        // Adjust coordinates for scale
        const adjustedX = x / scaleX;
        const adjustedY = y / scaleY;

        // Check if drop is within plot area bounds
        if (adjustedX >= margin.left && adjustedX <= margin.left + plotWidth &&
            adjustedY >= margin.top && adjustedY <= margin.top + plotHeight) {
            
            // Convert to domain coordinates (0-100 scale)
            const domainX = Math.max(0, Math.min(100, ((adjustedX - margin.left) / plotWidth) * 100));
            const domainY = Math.max(0, Math.min(100, ((adjustedY - margin.top) / plotHeight) * 100));

            // Get previous position if exists
            const existingResult = results.find(r => r.id === draggedItem.id);
            const previousPosition = existingResult ? { x: existingResult.x || existingResult.scores?.['Feasibility'] || 0, y: existingResult.y || existingResult.scores?.['Business Value'] || 0 } : undefined;

            // Save position via API (using votes endpoint)
            try {
                await api.post('/votes/', {
                    use_case_id: draggedItem.id,
                    participant_id: session.participantId,
                    scores: {
                        'Feasibility': Math.round(domainX),
                        'Business Value': Math.round(domainY)
                    }
                });

                // Emit socket event for real-time updates (workshop_id will be included by backend)
                socket.emit('matrix:position_update', {
                    participant_id: session.participantId,
                    participant_name: session.name || 'Participant',
                    use_case_id: draggedItem.id,
                    use_case_title: draggedItem.title,
                    position: { x: domainX, y: domainY },
                    previous_position: previousPosition,
                    workshop_id: session.workshopId
                });

                // Position is saved to database via API call above
                // Now update local state to reflect the new position
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

                const existingIndex = results.findIndex(r => r.id === draggedItem.id);
                if (existingIndex >= 0) {
                    // Update existing position (position is already saved to DB)
                    const updatedResults = [...results];
                    updatedResults[existingIndex] = newResult;
                    setResults(updatedResults);
                } else {
                    // Add new use case to graph (only when dragged, position saved to DB)
                    setResults([...results, newResult]);
                }

                toast.success(`Positioned "${draggedItem.title}" at F:${Math.round(domainX)}, V:${Math.round(domainY)}`);
            } catch (err: any) {
                console.error('Failed to save matrix position:', err);
                const errorMessage = err.response?.data?.detail || err.message || 'Failed to save position';
                toast.error(`Failed to save position: ${errorMessage}. Please try again.`);
            } finally {
                setIsSaving(false);
            }
        } else {
            toast.error('Please drop within the matrix plot area');
            setIsSaving(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDraggingOver(true);
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
            <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-gray-50' : 'bg-surface-900'}`}>
                <div className="flex items-center gap-3 text-gray-400">
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
        <div className={`min-h-screen ${theme === 'light' ? 'bg-gray-50' : 'bg-surface-900'}`}>
            <Header showBackButton={false} showHomeButton={false} />
            {/* Header */}
            <header className={`sticky top-14 z-40 border-b backdrop-blur ${theme === 'light'
                    ? 'bg-white/80 border-gray-200'
                    : 'bg-surface-800/80 border-white/5'
                }`}>
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/participant-dashboard')}
                            className="text-gray-400 hover:text-white"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                        <div>
                            <h1 className={`text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                Strategic Matrix
                            </h1>
                            <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                {workshopTitle}
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" onClick={handleLeave} className="text-gray-400 hover:text-white">
                        <LogOut className="w-4 h-4 mr-2" />
                        Leave
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {useCases.length === 0 ? (
                    <div className={`text-center py-20 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
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
                        <div className={`p-6 rounded-xl border ${theme === 'light'
                                ? 'bg-white border-gray-200'
                                : 'bg-surface-800 border-white/10'
                            }`}>
                            <h2 className={`text-lg font-semibold mb-2 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                Strategic Prioritization Matrix
                            </h2>
                            <p className={`text-xs mb-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                                Drag use cases from the right panel onto the matrix to position them.
                            </p>
                            <div
                                ref={matrixRef}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                className={`relative transition-all ${
                                    isDraggingOver && draggedItem
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
                                <ResultsChart data={results} showLabels={true} />
                            </div>
                        </div>

                        {/* Use Cases Tiles - Right Side (30%) */}
                        <div className={`p-4 rounded-xl border ${theme === 'light'
                                ? 'bg-white border-gray-200'
                                : 'bg-surface-800 border-white/10'
                            }`}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                    Use Cases ({useCases.length})
                                </h3>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowUseCaseModal(true)}
                                    className="h-7 px-3 text-xs"
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add New
                                </Button>
                            </div>
                            <p className={`text-xs mb-4 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                Drag tiles onto the matrix to position them
                            </p>
                            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                                {useCases.length === 0 ? (
                                    <div className={`text-center py-8 ${theme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>
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
                                                className={`p-3 rounded-lg border transition-all ${
                                                    isSaving ? 'cursor-not-allowed opacity-50' : 'cursor-move'
                                                } ${
                                                    theme === 'light'
                                                        ? 'bg-gray-50 border-gray-200 hover:border-brand-violet hover:shadow-md'
                                                        : 'bg-surface-700 border-white/5 hover:border-brand-violet/50 hover:shadow-lg'
                                                } ${
                                                    isOnMatrix ? 'ring-2 ring-brand-violet/30' : ''
                                                } ${
                                                    isDragging ? 'opacity-50 scale-95' : ''
                                                }`}
                                                aria-label={`Drag ${uc.title} onto matrix to position`}
                                            >
                                            <div className="flex items-start gap-2">
                                                <GripVertical className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                                    theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                                                }`} />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`font-semibold text-sm mb-1 line-clamp-2 ${
                                                        theme === 'light' ? 'text-gray-900' : 'text-white'
                                                    }`}>
                                                        {uc.title}
                                                    </h4>
                                                    {uc.description && (
                                                        <p className={`text-xs line-clamp-2 ${
                                                            theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                                        }`}>
                                                            {uc.description}
                                                        </p>
                                                    )}
                                                    {isOnMatrix && (
                                                        <div className={`text-xs mt-2 pt-2 border-t ${
                                                            theme === 'light' ? 'border-gray-200 text-gray-600' : 'border-white/10 text-gray-400'
                                                        }`}>
                                                            <span className="text-brand-violet">✓ On matrix</span>
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
                    <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl ${theme === 'light' ? 'bg-gray-50' : 'bg-surface-900'
                        }`}>
                        <button
                            onClick={() => setShowUseCaseModal(false)}
                            className={`absolute top-4 right-4 z-10 p-2 rounded-lg transition ${theme === 'light'
                                    ? 'hover:bg-gray-200 text-gray-500'
                                    : 'hover:bg-surface-700 text-gray-400'
                                }`}
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
