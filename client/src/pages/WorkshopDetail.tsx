import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UseCaseForm, type UseCaseData } from '../components/UseCaseForm';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { Button } from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';
import { Play, TrendingUp, Download, FileText, BarChart3, Plus, X, Map, LayoutGrid, Vote, Target, Sparkles, Edit, Trash2 } from 'lucide-react';
import { ResultsChart } from '../components/ResultsChart';
import { WorkshopInsights } from '../components/WorkshopInsights';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { SurveyList, SurveyBuilder, SurveyResults } from '../components/survey';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '../components/ui/Modal';
import { QrCode, Copy } from 'lucide-react';

import { PollManager } from '../components/polls/PollManager';
import { ReactionOverlay } from '../components/polls/ReactionOverlay';
import { QAPanel } from '../components/polls/QAPanel';
import { MessageSquare, Calculator, Users } from 'lucide-react';
import { ROICalculatorModal, ROIComparisonView } from '../components/roi';
import { BreakoutManager } from '../components/breakout';
import { RoadmapGenerator } from '../components/roadmap';
import { ChallengeManager } from '../components/challenges';
import { CopilotPanel } from '../components/ai-copilot';
import { useAuth } from '../context/AuthContext';
import { MatrixActivityDashboard } from '../components/MatrixActivityDashboard';
import { PrioritizationScale } from '../components/prioritization/PrioritizationScale';

export function WorkshopDetail() {
    const { id } = useParams();
    const { theme } = useTheme();
    const { hasRole } = useAuth();
    const [workshop, setWorkshop] = useState<any>(null);
    const [useCases, setUseCases] = useState<any[]>([]);
    const [currentPhase, setCurrentPhase] = useState<string>('');
    const [activeCardId, setActiveCardId] = useState<string | null>(null);
    const [results, setResults] = useState<any[]>([]);
    const [showAllParticipantPositions, setShowAllParticipantPositions] = useState(false);
    const [pendingFacilitators, setPendingFacilitators] = useState<any[]>([]);
    const [showQR, setShowQR] = useState(false);
    // const [currentView, setCurrentView] = useState<'matrix' | 'analytics'>('matrix'); // Unused
    const [surveyView, setSurveyView] = useState<'list' | 'create' | 'edit' | 'results' | null>(null);
    const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
    const [showAnalytics, setShowAnalytics] = useState<'matrix' | 'analytics' | 'roi' | 'scale'>('matrix');
    const [activeCriterionIndex, setActiveCriterionIndex] = useState(0);
    const [showAddUseCase, setShowAddUseCase] = useState(false);
    const [editingUseCase, setEditingUseCase] = useState<any>(null);
    const [showQA, setShowQA] = useState(false);
    const [roiSelectedUseCase, setRoiSelectedUseCase] = useState<{ id: string; title: string } | null>(null);
    const [roiModalOpen, setRoiModalOpen] = useState(false);
    const [showRoadmap, setShowRoadmap] = useState(false);

    // Tab navigation state
    type TabId = 'usecases' | 'polls' | 'challenges' | 'rooms' | 'insights';
    const [activeTab, setActiveTab] = useState<TabId>('usecases');

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: 'usecases', label: 'Use Cases', icon: <LayoutGrid className="w-4 h-4" /> },
        { id: 'polls', label: 'Polls', icon: <Vote className="w-4 h-4" /> },
        { id: 'challenges', label: 'Challenges', icon: <Target className="w-4 h-4" /> },
        { id: 'rooms', label: 'Rooms & Surveys', icon: <Users className="w-4 h-4" /> },
        { id: 'insights', label: 'Insights', icon: <Sparkles className="w-4 h-4" /> },
    ];



    useEffect(() => {
        // ... (existing code, ensure no duplicates if I copy-paste too much)
        // I will rely on the "ReplacementContent" to just include imports and updated Render
        fetchWorkshop();
        // Join socket room as facilitator
        socket.connect();
        socket.emit('join_workshop', { workshop_id: id });

        socket.on('new_submission', (data: any) => {
            console.log("New submission:", data);
            setUseCases(prev => [data, ...prev]);
            toast.info("New submission received");
        });

        socket.on('participant_joined', () => {
            console.log("Participant joined");
        });

        socket.on('active_card_update', (data: any) => {
            if (data.active_card) setActiveCardId(data.active_card.id);
        });

        socket.on('workshop_state_change', (data: any) => {
            setCurrentPhase(data.phase);
            toast.info(`Phase changed to ${data.phase}`);
        });

        socket.on('facilitator_request', (data: any) => {
            setPendingFacilitators(prev => [...prev, data]);
            toast.info(`${data.display_name} requested facilitator access`);
        });

        // Listen for matrix position updates to refresh results
        const handleMatrixUpdate = async (data: any) => {
            console.log('Matrix position update received in WorkshopDetail:', data);
            // Refresh results when participant positions change
            if (currentPhase === 'ANALYSIS') {
                try {
                    const resultsData = await api.get(`/results/${id}`);
                    setResults(resultsData.data);
                } catch (e) {
                    console.error('Failed to refresh results:', e);
                }
            }
        };

        socket.on('matrix:position_update', handleMatrixUpdate);
        socket.on('vote_update', handleMatrixUpdate); // Also listen for vote updates

        socket.on('use_case_updated', (updatedUseCase: any) => {
            setUseCases(prev => prev.map(uc => uc.id === updatedUseCase.id ? { ...uc, ...updatedUseCase } : uc));
            toast.info("Use case updated");
        });

        socket.on('use_case_deleted', ({ id }: { id: string }) => {
            setUseCases(prev => prev.filter(uc => uc.id !== id));
            toast.info("Use case deleted");
        });

        return () => {
            socket.off('new_submission');
            socket.off('participant_joined');
            socket.off('active_card_update');
            socket.off('workshop_state_change');
            socket.off('facilitator_request');
            socket.off('matrix:position_update', handleMatrixUpdate);
            socket.off('vote_update', handleMatrixUpdate);
            socket.off('use_case_updated');
            socket.off('use_case_deleted');
        };
    }, [id, currentPhase]);

    // ... (keep existing methods)
    const fetchWorkshop = async () => {
        try {
            const { data } = await api.get(`/workshops/${id}`);
            setWorkshop(data);
            setCurrentPhase(data.current_phase);
            setActiveCardId(data.active_use_case_id);
            if (data.pending_facilitators) {
                setPendingFacilitators(data.pending_facilitators);
            }

            // Fetch existing use cases
            const ucData = await api.get(`/usecases/${id}`);
            setUseCases(ucData.data);

            // If already analysis, fetch results
            if (data.current_phase === 'ANALYSIS') {
                const resultsData = await api.get(`/results/${id}`);
                setResults(resultsData.data);
                setShowAllParticipantPositions(false); // Reset to aggregated view
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to load workshop data");
        }
    };

    const startPhase = async (phase: string) => {
        try {
            await api.post(`/workshops/${id}/phase`, { phase });
            setCurrentPhase(phase);
            if (phase === 'ANALYSIS') {
                const { data } = await api.get(`/results/${id}`);
                setResults(data);
            }
            toast.success(`Started ${phase} phase`);
        } catch (e) {
            console.error(e);
            toast.error("Failed to change phase");
        }
    };

    const activateCard = async (ucId: string) => {
        try {
            await api.post(`/workshops/${id}/active_card`, { use_case_id: ucId });
            setActiveCardId(ucId);
            toast.success("Card presented for voting");
        } catch (e) {
            console.error(e);
            toast.error("Failed to activate card");
        }
    };

    const handleFacilitatorAction = async (participantId: string, role: string) => {
        try {
            await api.patch(`/participants/${participantId}/role`, { role });
            // Remove from list
            setPendingFacilitators(prev => prev.filter(p => p.participant_id !== participantId));
            toast.success(`User ${role === 'FACILITATOR' ? 'approved' : 'denied'}`);
        } catch (e) {
            console.error(e);
            toast.error("Failed to update role");
        }
    };

    const handleSubmitUseCase = async (data: UseCaseData) => {
        try {
            await api.post('/usecases/', {
                ...data,
                workshop_id: id,
                added_by_facilitator: true
            });

            toast.success("Use case added successfully!");
            setShowAddUseCase(false);
            fetchWorkshop(); // Refresh use cases
        } catch (err) {
            console.error(err);
            toast.error("Failed to add use case");
        }
    };

    const handleEditSubmission = async (data: UseCaseData) => {
        if (!editingUseCase) return;
        try {
            await api.put(`/usecases/${editingUseCase.id}`, {
                ...data, // Include all form fields
                // Ensure we handle fields that might be missing in data but needed or ignored
            });

            setEditingUseCase(null);
            toast.success("Use case updated successfully");
            // Socket will update the list
        } catch (err) {
            console.error(err);
            toast.error("Failed to update use case");
        }
    };

    const handleDeleteUseCase = async (ucId: string) => {
        if (!confirm("Are you sure you want to delete this use case? This cannot be undone.")) return;

        try {
            await api.delete(`/usecases/${ucId}`);
            // Socket will update the list
            toast.success("Use case deleted");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete use case");
        }
    };

    const downloadCSV = () => {
        if (!results.length || !workshop?.config?.criteria) return;

        const criteriaNames = workshop.config.criteria.map((c: any) => c.name);
        const headers = ['ID', 'Title', 'Category', ...criteriaNames, 'Total Score', 'Vote Count'];
        const rows = results.map((r: any) => [
            r.id,
            `"${r.title.replace(/"/g, '""')}"`,
            r.category || '',
            ...criteriaNames.map((c: string) => r.scores[c] || 0),
            r.total_score || 0,
            r.vote_count || 1
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `hotspot_results_${id}.csv`;
        link.click();
        toast.success("Export started");
    };

    if (!workshop) return <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-gray-50 text-gray-600' : 'bg-surface-900 text-gray-400'}`}>Loading...</div>;

    return (
        <div className={`min-h-screen p-6 pb-20 ${theme === 'light' ? 'bg-gray-50' : 'bg-surface-900'}`}>
            <ReactionOverlay />

            {/* Quick Polls Overlay / Manager - Rendered in Sidebar */}

            <header className={`flex justify-between items-center mb-8 border-b pb-4 ${theme === 'light' ? 'border-gray-200' : 'border-white/10'
                }`}>
                {/* Header Content - Back button now in main Header */}
                <div className="flex items-start gap-4">
                    <div>
                        <h1 className={`text-3xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                            {workshop.title}
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-brand-magenta font-mono text-xl font-bold">{workshop.pin}</span>
                            <span className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Join PIN</span>
                            <span className={`ml-4 px-2 py-0.5 text-xs rounded uppercase tracking-wider font-mono ${theme === 'light'
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-white/10 text-gray-400'
                                }`}>
                                {currentPhase}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <Button variant="ghost" className="text-sm h-8 px-2" onClick={() => setShowQR(true)}>
                        <QrCode className="w-4 h-4 mr-2" /> Show Join Code
                    </Button>
                    <Button variant={showQA ? "primary" : "secondary"} onClick={() => setShowQA(!showQA)}>
                        <MessageSquare className="w-4 h-4 mr-2" /> Q&A
                    </Button>
                </div>

                <div className="flex gap-4">
                    {/* Phase Buttons */}
                    {currentPhase === 'INTAKE' && (
                        <Button onClick={() => startPhase('SCORING')}>
                            Next: Start Scoring &rarr;
                        </Button>
                    )}
                    {currentPhase === 'SCORING' && (
                        <Button onClick={() => startPhase('ANALYSIS')}>
                            <TrendingUp className="w-4 h-4 mr-2" /> Show Results
                        </Button>
                    )}
                    {currentPhase === 'ANALYSIS' && (
                        <Button onClick={downloadCSV} variant="secondary">
                            <Download className="w-4 h-4 mr-2" /> Export CSV
                        </Button>
                    )}
                    {currentPhase === 'DRAFT' && (
                        <Button onClick={() => startPhase('INTAKE')}>
                            <Play className="w-4 h-4 mr-2" /> Start Intake
                        </Button>
                    )}
                </div>
            </header>

            {currentPhase === 'ANALYSIS' ? (
                // Analysis View
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {/* View Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            <Button
                                variant={showAnalytics === 'matrix' ? 'primary' : 'secondary'}
                                onClick={() => setShowAnalytics('matrix')}
                            >
                                <TrendingUp className="w-4 h-4 mr-2" /> Matrix View
                            </Button>
                            <Button
                                variant={showAnalytics === 'analytics' ? 'primary' : 'secondary'}
                                onClick={() => setShowAnalytics('analytics')}
                            >
                                <BarChart3 className="w-4 h-4 mr-2" /> Analytics
                            </Button>
                            <Button
                                variant={showAnalytics === 'roi' ? 'primary' : 'secondary'}
                                onClick={() => setShowAnalytics('roi')}
                            >
                                <Calculator className="w-4 h-4 mr-2" /> ROI Portfolio
                            </Button>
                            {currentPhase === 'ANALYSIS' && useCases.length > 0 && (
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowRoadmap(true)}
                                >
                                    <Map className="w-4 h-4 mr-2" /> Generate Roadmap
                                </Button>
                            )}
                        </div>
                    </div>

                    {showAnalytics === 'analytics' ? (
                        <AnalyticsDashboard workshopId={id!} workshopTitle={workshop?.title} />
                    ) : showAnalytics === 'roi' ? (
                        <ROIComparisonView workshopId={id!} useCases={useCases} />
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <h2 className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Strategic Prioritization</h2>
                                <div className="flex gap-2">
                                    <Button
                                        variant={!showAllParticipantPositions ? 'primary' : 'secondary'}
                                        className="py-1 px-3 text-sm"
                                        onClick={async () => {
                                            const resultsData = await api.get(`/results/${id}`);
                                            setResults(resultsData.data);
                                            setShowAllParticipantPositions(false);
                                        }}
                                    >
                                        Aggregated View
                                    </Button>
                                    <Button
                                        variant={showAllParticipantPositions ? 'primary' : 'secondary'}
                                        className="py-1 px-3 text-sm"
                                        onClick={() => {
                                            // MatrixActivityDashboard handleRefresh will trigger onRefreshMatrix
                                            // We just need to trigger a manual refresh or wait for socket
                                            setShowAllParticipantPositions(true);
                                        }}
                                    >
                                        All Participants
                                    </Button>
                                    <div className="w-px h-8 bg-gray-200 dark:bg-white/10 mx-2" />
                                    <Button
                                        variant={showAnalytics === 'matrix' ? 'primary' : 'secondary'}
                                        className="py-1 px-3 text-sm"
                                        onClick={() => setShowAnalytics('matrix')}
                                    >
                                        2D Matrix
                                    </Button>
                                    <Button
                                        variant={showAnalytics === 'scale' ? 'primary' : 'secondary'}
                                        className="py-1 px-3 text-sm"
                                        onClick={() => setShowAnalytics('scale')}
                                    >
                                        1D Scale
                                    </Button>
                                </div>
                            </div>

                            {/* Matrix View with Activity Dashboard */}
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 mt-4">
                                <div className="p-6 rounded-2xl border theme-card theme-border bg-white/50 backdrop-blur-sm">
                                    {(() => {
                                        const xAxisKeywords = ['Value', 'Impact', 'Urgency', 'Business Value', 'ROI', 'Benefit'];
                                        const yAxisKeywords = ['Effort', 'Feasibility', 'Complexity', 'Cost', 'Risk', 'Resource'];

                                        const criteriaNames = workshop.config.criteria.map((c: any) => c.name);
                                        let xLabel = criteriaNames[0] || "Feasibility";
                                        let yLabel = criteriaNames[1] || "Business Value";

                                        const mappedResults = results.map(item => {
                                            const itemScores = item.scores || {};
                                            let xTotal = 0, xCount = 0;
                                            let yTotal = 0, yCount = 0;

                                            Object.entries(itemScores).forEach(([name, score]: [string, any]) => {
                                                if (score === -1) return;
                                                const lowerName = name.toLowerCase();
                                                if (xAxisKeywords.some(k => lowerName.includes(k.toLowerCase()))) {
                                                    xTotal += score;
                                                    xCount++;
                                                } else if (yAxisKeywords.some(k => lowerName.includes(k.toLowerCase()))) {
                                                    yTotal += score;
                                                    yCount++;
                                                }
                                            });

                                            if (xCount === 0 && yCount === 0 && criteriaNames.length > 0) {
                                                const mid = Math.ceil(criteriaNames.length / 2);
                                                criteriaNames.forEach((name: string, idx: number) => {
                                                    const score = itemScores[name];
                                                    if (score === undefined || score === -1) return;
                                                    if (idx < mid) {
                                                        xTotal += score;
                                                        xCount++;
                                                    } else {
                                                        yTotal += score;
                                                        yCount++;
                                                    }
                                                });
                                                if (criteriaNames.length > 2) {
                                                    xLabel = "Aggregated Value";
                                                    yLabel = "Aggregated Effort";
                                                }
                                            } else {
                                                if (xCount > 1) xLabel = "Aggregated Benefit";
                                                if (yCount > 1) yLabel = "Aggregated Cost/Effort";
                                            }

                                            return {
                                                ...item,
                                                x: xCount > 0 ? (xTotal / xCount) * 10 : (item.x || 0),
                                                y: yCount > 0 ? (yTotal / yCount) * 10 : (item.y || 0)
                                            };
                                        });

                                        return (
                                            <>
                                                {showAnalytics === 'scale' ? (
                                                    <div className="space-y-6">
                                                        <div className="flex items-center justify-center gap-4 mb-4">
                                                            {workshop.config.criteria.map((c: any, idx: number) => (
                                                                <button
                                                                    key={c.name}
                                                                    onClick={() => setActiveCriterionIndex(idx)}
                                                                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${activeCriterionIndex === idx
                                                                        ? 'bg-brand-violet text-white shadow-lg scale-105'
                                                                        : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200'
                                                                        }`}
                                                                >
                                                                    {c.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <PrioritizationScale
                                                            criterion={workshop.config.criteria[activeCriterionIndex]?.name}
                                                            useCases={useCases}
                                                            scores={results.reduce((acc, curr) => {
                                                                if (showAllParticipantPositions) return acc;
                                                                return { ...acc, [curr.id]: curr.scores };
                                                            }, {})}
                                                            readOnly={true}
                                                            participants={showAllParticipantPositions ? results.map(r => ({
                                                                id: r.participant_id,
                                                                name: r.participant_name,
                                                                color: r.participantColor,
                                                                useCaseId: r.use_case_id,
                                                                useCaseTitle: r.use_case_title,
                                                                scores: { [workshop.config.criteria[activeCriterionIndex]?.name]: r.scores?.[workshop.config.criteria[activeCriterionIndex]?.name] }
                                                            })).filter(p => p.scores[workshop.config.criteria[activeCriterionIndex]?.name] !== undefined) : undefined}
                                                        />
                                                    </div>
                                                ) : (
                                                    <ResultsChart
                                                        data={mappedResults}
                                                        showLabels={!showAllParticipantPositions}
                                                        readOnly={true}
                                                        xAxisLabel={xLabel}
                                                        yAxisLabel={yLabel}
                                                    />
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* Matrix Activity Dashboard - Only visible to admins/facilitators */}
                                {hasRole(['admin', 'facilitator']) && (
                                    <MatrixActivityDashboard
                                        workshopId={id!}
                                        isVisible={showAnalytics === 'matrix' || showAnalytics === 'scale'}
                                        onRefreshMatrix={(positions, isAllPositions) => {
                                            setResults(positions);
                                            setShowAllParticipantPositions(isAllPositions);
                                        }}
                                        onPositionUpdate={(updatedPos) => {
                                            if (showAllParticipantPositions) {
                                                setResults(prev => {
                                                    const index = prev.findIndex(p => p.id === updatedPos.id);
                                                    if (index !== -1) {
                                                        const newResults = [...prev];
                                                        newResults[index] = { ...newResults[index], ...updatedPos };
                                                        return newResults;
                                                    }
                                                    return [...prev, updatedPos];
                                                });
                                            } else {
                                                // If in aggregated view, we should probably fetch results to get the new average
                                                // but for now, we can just trigger a fetch if it's been a while
                                                api.get(`/results/${id}`).then(res => setResults(res.data)).catch(console.error);
                                            }
                                        }}
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                                {results.map((r: any) => (
                                    <div key={r.id} className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/5'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className={`font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{r.title}</h3>
                                            <span className="text-brand-violet font-mono font-bold text-xl">{r.total_score}</span>
                                        </div>
                                        <div className={`text-sm space-y-1 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                                            <div className="flex justify-between"><span>Feasibility</span> <span>{r.scores['Feasibility']}</span></div>
                                            <div className="flex justify-between"><span>Value</span> <span>{r.scores['Business Value']}</span></div>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            className="w-full mt-3 h-8 text-xs"
                                            onClick={() => {
                                                setRoiSelectedUseCase({ id: r.id, title: r.title });
                                                setRoiModalOpen(true);
                                            }}
                                        >
                                            <Calculator className="w-3 h-3 mr-1" />
                                            Calculate ROI
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                // Main View (Intake/Scoring) with Tabbed Interface
                <div className="space-y-6">
                    {/* Facilitator Requests Banner - Always visible when there are pending requests */}
                    {pendingFacilitators.length > 0 && (
                        <div className={`rounded-lg p-4 animate-in fade-in slide-in-from-top-4 ${theme === 'light'
                            ? 'bg-brand-violet/10 border border-brand-violet/30'
                            : 'bg-brand-violet/10 border border-brand-violet/30'
                            }`}>
                            <h3 className="text-sm font-bold text-brand-violet mb-3 flex items-center justify-between">
                                Facilitator Requests
                                <span className="bg-brand-violet text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingFacilitators.length}</span>
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {pendingFacilitators.map((pf) => (
                                    <div key={pf.participant_id} className={`p-3 rounded border flex items-center gap-3 ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-surface-900/50 border-white/5'
                                        }`}>
                                        <span className="text-sm font-medium theme-text-primary">{pf.display_name}</span>
                                        <div className="flex gap-2">
                                            <Button
                                                className="h-7 text-xs px-3"
                                                onClick={() => handleFacilitatorAction(pf.participant_id, 'FACILITATOR')}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                className="h-7 text-xs px-3"
                                                onClick={() => handleFacilitatorAction(pf.participant_id, 'PARTICIPANT')}
                                            >
                                                Deny
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tab Navigation */}
                    <div className={`flex gap-1 p-1 rounded-lg ${theme === 'light' ? 'bg-gray-100' : 'theme-bg-secondary'
                        }`}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-brand-violet text-white shadow-sm'
                                    : theme === 'light'
                                        ? 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                                        : 'text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                {tab.icon}
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="animate-in fade-in duration-200">
                        {/* Use Cases Tab */}
                        {activeTab === 'usecases' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                        {currentPhase === 'SCORING' ? 'Scoring Queue' : 'Use Cases'}
                                        <span className={`text-sm font-normal px-2 py-0.5 rounded-full ${theme === 'light' ? 'text-gray-500 bg-gray-100' : 'text-gray-500 bg-surface-800'}`}>{useCases.length}</span>
                                    </h2>
                                    <Button
                                        variant="secondary"
                                        className="h-9"
                                        onClick={() => setShowAddUseCase(true)}
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Add Use Case
                                    </Button>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                    {useCases.length === 0 ? (
                                        <div className={`col-span-2 text-center py-12 border border-dashed rounded-xl ${theme === 'light' ? 'border-gray-300 text-gray-500 bg-gray-50' : 'border-white/10 text-gray-500'}`}>
                                            Waiting for submissions...
                                        </div>
                                    ) : (
                                        useCases.map((uc: any) => (
                                            <div
                                                key={uc.id}
                                                className={`
                                                    p-4 rounded-xl border transition-all animate-in fade-in slide-in-from-bottom-2
                                                    ${activeCardId === uc.id ? 'bg-brand-violet/10 border-brand-violet ring-1 ring-brand-violet' : theme === 'light' ? 'bg-white border-gray-200 hover:border-brand-violet/30' : 'bg-surface-800/50 border-white/5 hover:border-brand-violet/30'}
                                                `}
                                            >
                                                <div className="flex justify-between mb-2">
                                                    <h3 className={`font-bold text-lg ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{uc.title}</h3>
                                                    <div className="flex items-center gap-2">
                                                        {activeCardId === uc.id ? (
                                                            <span className="text-xs text-brand-violet font-bold py-1 px-2 bg-brand-violet/10 rounded">VOTING ACTIVE</span>
                                                        ) : (
                                                            hasRole(['admin', 'facilitator']) && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        className="h-8 text-xs py-0 text-gray-400 hover:text-brand-violet"
                                                                        onClick={() => setEditingUseCase(uc)}
                                                                        title="Edit"
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        className="h-8 text-xs py-0 text-gray-400 hover:text-red-500"
                                                                        onClick={() => handleDeleteUseCase(uc.id)}
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </>
                                                            )
                                                        )}
                                                        {currentPhase === 'SCORING' && activeCardId !== uc.id && (
                                                            <Button
                                                                variant="ghost"
                                                                className="h-8 text-xs py-0"
                                                                onClick={() => activateCard(uc.id)}
                                                            >
                                                                Present for Voting
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className={`text-sm mb-3 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>{uc.description}</p>
                                                {uc.proposed_solution && (
                                                    <div className={`p-2 rounded text-xs ${theme === 'light' ? 'bg-gray-100 text-gray-600' : 'bg-black/20 text-gray-400'}`}>
                                                        <strong className="text-brand-violet">Solution:</strong> {uc.proposed_solution}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Polls Tab */}
                        {activeTab === 'polls' && (
                            <div className="max-w-2xl">
                                <PollManager workshopId={id} />
                            </div>
                        )}

                        {/* Challenges Tab */}
                        {activeTab === 'challenges' && id && (
                            <ChallengeManager
                                workshopId={id}
                                isFacilitator={hasRole(['admin', 'facilitator'])}
                            />
                        )}

                        {/* Rooms & Surveys Tab */}
                        {activeTab === 'rooms' && id && (
                            <div className="grid gap-8 lg:grid-cols-2">
                                {/* Breakout Rooms */}
                                <div className={`p-6 rounded-xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'theme-bg-secondary theme-border'
                                    }`}>
                                    <BreakoutManager workshopId={id} />
                                </div>

                                {/* Surveys */}
                                <div className={`p-6 rounded-xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'theme-bg-secondary theme-border'
                                    }`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold theme-text-primary">Surveys</h3>
                                        <Button
                                            variant="secondary"
                                            className="h-8 text-sm"
                                            onClick={() => {
                                                setSurveyView('create');
                                                setSelectedSurveyId(null);
                                            }}
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            New Survey
                                        </Button>
                                    </div>
                                    {surveyView === null && (
                                        <SurveyList
                                            workshopId={id}
                                            onCreateSurvey={() => {
                                                setSurveyView('create');
                                                setSelectedSurveyId(null);
                                            }}
                                            onEditSurvey={(surveyId) => {
                                                setSurveyView('edit');
                                                setSelectedSurveyId(surveyId);
                                            }}
                                            onViewResults={(surveyId) => {
                                                setSurveyView('results');
                                                setSelectedSurveyId(surveyId);
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Insights Tab */}
                        {activeTab === 'insights' && id && (
                            <div className="grid gap-6 lg:grid-cols-2">
                                {/* Workshop Stats */}
                                <div className={`p-6 rounded-xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'theme-bg-secondary theme-border'
                                    }`}>
                                    <h3 className="text-lg font-bold mb-4 theme-text-primary">Workshop Stats</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="contrast-muted">Participants</span>
                                            <span className="font-mono theme-text-primary text-lg">--</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="contrast-muted">Submissions</span>
                                            <span className="font-mono theme-text-primary text-lg">{useCases.length}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="contrast-muted">Current Phase</span>
                                            <span className="font-mono text-brand-violet text-lg">{currentPhase}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Insights */}
                                <div>
                                    <WorkshopInsights workshopId={id} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Q&A Modal/Sidebar */}
            <Modal isOpen={showQA} onClose={() => setShowQA(false)} title="Q&A & Discussion">
                <div className="h-[60vh]">
                    <QAPanel />
                </div>
            </Modal>

            {/* Other Modals (QR, Surveys, AddUseCase) */}
            <Modal isOpen={showQR} onClose={() => setShowQR(false)} title="Join Workshop">
                <div className="flex flex-col items-center space-y-6 py-4">
                    <div className="bg-white p-4 rounded-xl shadow-lg">
                        <QRCodeSVG
                            value={`${window.location.protocol}//${window.location.host}/join?pin=${workshop.pin}`}
                            size={200}
                            level="H"
                        />
                    </div>

                    <div className="text-center space-y-2">
                        <p className="contrast-muted text-sm">Scan to join</p>
                        <div className={`flex items-center gap-2 p-3 rounded-lg border ${theme === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-surface-900 border-white/10'
                            }`}>
                            <span className="font-mono font-bold text-2xl tracking-widest theme-text-primary">{workshop.pin}</span>
                        </div>
                    </div>

                    <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => {
                            const url = `${window.location.protocol}//${window.location.host}/join?pin=${workshop.pin}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Link copied to clipboard");
                        }}
                    >
                        <Copy className="w-4 h-4 mr-2" /> Copy Link
                    </Button>
                </div>
            </Modal>

            {/* Survey Modals */}
            {(surveyView === 'create' || surveyView === 'edit') && id && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
                    <div className="min-h-screen py-8 px-4">
                        <div className={`max-w-4xl mx-auto rounded-xl border p-6 ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-surface-900 border-white/10'
                            }`}>
                            <SurveyBuilder
                                workshopId={id}
                                surveyId={surveyView === 'edit' ? selectedSurveyId || undefined : undefined}
                                onSave={() => setSurveyView(null)}
                                onCancel={() => setSurveyView(null)}
                            />
                        </div>
                    </div>
                </div>
            )}
            {surveyView === 'results' && selectedSurveyId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
                    <div className="min-h-screen py-8 px-4">
                        <div className={`max-w-4xl mx-auto rounded-xl border p-6 ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-surface-900 border-white/10'
                            }`}>
                            <SurveyResults
                                surveyId={selectedSurveyId}
                                onClose={() => setSurveyView(null)}
                            />
                        </div>
                    </div>
                </div>
            )}
            {showAddUseCase && (
                <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
                    <div className="min-h-screen py-8 px-4 flex items-center justify-center">
                        <div className={`relative w-full max-w-2xl rounded-xl border p-6 ${theme === 'light'
                            ? 'bg-white border-gray-200'
                            : 'bg-surface-900 border-white/10'
                            }`}>
                            <button
                                onClick={() => setShowAddUseCase(false)}
                                className={`absolute top-4 right-4 p-2 rounded-lg transition ${theme === 'light'
                                    ? 'hover:bg-gray-100 text-gray-500'
                                    : 'hover:bg-surface-700 text-gray-400'
                                    }`}
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h2 className={`text-xl font-bold mb-6 ${theme === 'light' ? 'text-gray-900' : 'text-white'
                                }`}>
                                Add Use Case
                            </h2>

                            <UseCaseForm
                                workshopId={id!}
                                onSubmit={handleSubmitUseCase}
                                submitLabel="Add Use Case"
                                onSuccess={() => setShowAddUseCase(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Use Case Modal */}
            {editingUseCase && (
                <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
                    <div className="min-h-screen py-8 px-4 flex items-center justify-center">
                        <div className={`relative w-full max-w-2xl rounded-xl border p-6 ${theme === 'light'
                            ? 'bg-white border-gray-200'
                            : 'bg-surface-900 border-white/10'
                            }`}>
                            <button
                                onClick={() => setEditingUseCase(null)}
                                className={`absolute top-4 right-4 p-2 rounded-lg transition ${theme === 'light'
                                    ? 'hover:bg-gray-100 text-gray-500'
                                    : 'hover:bg-surface-700 text-gray-400'
                                    }`}
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h2 className={`text-xl font-bold mb-6 ${theme === 'light' ? 'text-gray-900' : 'text-white'
                                }`}>
                                Edit Use Case
                            </h2>

                            <UseCaseForm
                                workshopId={id!}
                                initialData={editingUseCase}
                                onSubmit={handleEditSubmission}
                                submitLabel="Update Use Case"
                                onSuccess={() => setEditingUseCase(null)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ROI Calculator Modal */}
            {roiSelectedUseCase && id && (
                <ROICalculatorModal
                    isOpen={roiModalOpen}
                    onClose={() => {
                        setRoiModalOpen(false);
                        setRoiSelectedUseCase(null);
                    }}
                    workshopId={id}
                    useCaseId={roiSelectedUseCase.id}
                    useCaseTitle={roiSelectedUseCase.title}
                />
            )}

            {showRoadmap && (
                <Modal
                    isOpen={showRoadmap}
                    onClose={() => setShowRoadmap(false)}
                    title="Implementation Roadmap Generator"
                    size="large"
                >
                    <div className="p-4">
                        <RoadmapGenerator
                            workshopId={id!}
                            useCases={useCases.map(uc => ({
                                id: uc.id,
                                title: uc.title,
                                description: uc.description,
                                value_score: results.find((r: any) => r.id === uc.id)?.scores?.['Business Value'],
                                feasibility_score: results.find((r: any) => r.id === uc.id)?.scores?.['Feasibility']
                            }))}
                            onClose={() => setShowRoadmap(false)}
                        />
                    </div>
                </Modal>
            )}

            {/* AI Copilot Panel - US16 */}
            {id && hasRole(['admin', 'facilitator']) && (
                <CopilotPanel
                    workshopId={id}
                    workshopTitle={workshop?.title}
                    currentPhase={currentPhase}
                    activeUseCaseId={activeCardId || undefined}
                    activeUseCaseTitle={activeCardId ? useCases.find(uc => uc.id === activeCardId)?.title : undefined}
                    isFacilitator={hasRole(['admin', 'facilitator'])}
                />
            )}
        </div>
    );
}

