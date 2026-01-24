import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { Button } from '../components/ui/Button';
import { Play, TrendingUp, Download, ArrowLeft } from 'lucide-react';
import { ResultsChart } from '../components/ResultsChart';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '../components/ui/Modal';
import { QrCode, Copy } from 'lucide-react';

export function WorkshopDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [workshop, setWorkshop] = useState<any>(null);
    const [useCases, setUseCases] = useState<any[]>([]);
    const [currentPhase, setCurrentPhase] = useState<string>('');
    const [activeCardId, setActiveCardId] = useState<string | null>(null);
    const [results, setResults] = useState<any[]>([]);
    const [pendingFacilitators, setPendingFacilitators] = useState<any[]>([]);
    const [showQR, setShowQR] = useState(false);

    useEffect(() => {
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

        return () => {
            socket.off('new_submission');
            socket.off('participant_joined');
            socket.off('active_card_update');
            socket.off('active_card_update');
            socket.off('workshop_state_change');
            socket.off('facilitator_request');
        };
    }, [id]);

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

    const downloadCSV = () => {
        if (!results.length) return;

        const headers = ['ID', 'Title', 'Category', 'Feasibility', 'Business Value', 'Total Score', 'Vote Count'];
        const rows = results.map((r: any) => [
            r.id,
            `"${r.title.replace(/"/g, '""')}"`, // Escape quotes
            r.category || '',
            r.scores['Feasibility'] || 0,
            r.scores['Business Value'] || 0,
            r.total_score,
            r.vote_count
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

    if (!workshop) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-surface-900 p-6">
            <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                <div className="flex items-start gap-4">
                    <Button variant="ghost" className="mt-1 p-2 h-auto" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-white">{workshop.title}</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-brand-magenta font-mono text-xl font-bold">{workshop.pin}</span>
                            <span className="text-gray-400 text-sm">Join PIN</span>
                            <span className="ml-4 px-2 py-0.5 bg-white/10 text-xs rounded uppercase tracking-wider text-gray-400 font-mono">
                                {currentPhase}
                            </span>
                        </div>
                    </div>
                </div>
                <div>
                    <Button variant="ghost" className="text-sm h-8 px-2" onClick={() => setShowQR(true)}>
                        <QrCode className="w-4 h-4 mr-2" /> Show Join Code
                    </Button>
                </div>
                <div className="flex gap-4">
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
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <h2 className="text-2xl font-bold">Strategic Matrix</h2>
                    <ResultsChart data={results} />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        {results.map((r: any) => (
                            <div key={r.id} className="bg-surface-800 p-4 rounded-xl border border-white/5">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold">{r.title}</h3>
                                    <span className="text-brand-violet font-mono font-bold text-xl">{r.total_score}</span>
                                </div>
                                <div className="text-sm text-gray-400 space-y-1">
                                    <div className="flex justify-between"><span>Feasibility</span> <span>{r.scores['Feasibility']}</span></div>
                                    <div className="flex justify-between"><span>Value</span> <span>{r.scores['Business Value']}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            {currentPhase === 'SCORING' ? 'Scoring Queue' : 'Incoming Submissions'}
                            <span className="text-sm font-normal text-gray-500 bg-surface-800 px-2 py-0.5 rounded-full">{useCases.length}</span>
                        </h2>

                        <div className="grid gap-4">
                            {useCases.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl text-gray-500">
                                    Waiting for submissions...
                                </div>
                            ) : (
                                useCases.map((uc: any) => (
                                    <div
                                        key={uc.id}
                                        className={`
                                            p-4 rounded-xl border transition-all animate-in fade-in slide-in-from-bottom-2
                                            ${activeCardId === uc.id ? 'bg-brand-violet/10 border-brand-violet ring-1 ring-brand-violet' : 'bg-surface-800/50 border-white/5 hover:border-brand-violet/30'}
                                        `}
                                    >
                                        <div className="flex justify-between mb-2">
                                            <h3 className="font-bold text-lg">{uc.title}</h3>
                                            <div>
                                                {currentPhase === 'SCORING' && (
                                                    activeCardId === uc.id ? (
                                                        <span className="text-xs text-brand-violet font-bold py-1 px-2 bg-brand-violet/10 rounded">VOTING ACTIVE</span>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            className="h-8 text-xs py-0"
                                                            onClick={() => activateCard(uc.id)}
                                                        >
                                                            Present for Voting
                                                        </Button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-gray-300 text-sm mb-3">{uc.description}</p>
                                        {uc.proposed_solution && (
                                            <div className="bg-black/20 p-2 rounded text-xs text-gray-400">
                                                <strong className="text-brand-violet">Solution:</strong> {uc.proposed_solution}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="bg-surface-800 rounded-xl p-6 border border-white/10 sticky top-6 space-y-6">
                            {pendingFacilitators.length > 0 && (
                                <div className="bg-brand-violet/10 border border-brand-violet/30 rounded-lg p-4 animate-in fade-in slide-in-from-right-4">
                                    <h3 className="text-sm font-bold text-brand-violet mb-3 flex items-center justify-between">
                                        Facilitator Requests
                                        <span className="bg-brand-violet text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingFacilitators.length}</span>
                                    </h3>
                                    <div className="space-y-3">
                                        {pendingFacilitators.map((pf) => (
                                            <div key={pf.participant_id} className="bg-surface-900/50 p-3 rounded border border-white/5">
                                                <div className="text-sm font-bold mb-2">{pf.display_name}</div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        className="h-7 text-xs px-2 flex-1"
                                                        onClick={() => handleFacilitatorAction(pf.participant_id, 'FACILITATOR')}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        className="h-7 text-xs px-2 flex-1 bg-white/5 hover:bg-white/10"
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

                            <div>
                                <h2 className="text-lg font-bold mb-4">Workshop Stats</h2>
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Participants</span>
                                        <span className="font-mono">--</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Submissions</span>
                                        <span className="font-mono">{useCases.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Modal isOpen={showQR} onClose={() => setShowQR(false)} title="Join Workshop">
                <div className="flex flex-col items-center space-y-6 py-4">
                    <div className="bg-white p-4 rounded-xl">
                        <QRCodeSVG
                            value={`${window.location.protocol}//${window.location.host}/join?pin=${workshop.pin}`}
                            size={200}
                            level="H"
                        />
                    </div>

                    <div className="text-center space-y-2">
                        <p className="text-gray-400 text-sm">Scan to join</p>
                        <div className="flex items-center gap-2 bg-surface-900 p-2 rounded-lg border border-white/10">
                            <span className="font-mono font-bold text-xl tracking-widest">{workshop.pin}</span>
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
        </div>
    );
}
