import { useState, useEffect } from 'react';
import { type Poll, PollService } from '../../lib/api/polls';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Plus, BarChart2, X, StopCircle, Download, Clock } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useTheme } from '../../context/ThemeContext';
import { socket } from '../../lib/socket';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

type PollType = 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'RATING_SCALE' | 'YES_NO' | 'OPEN_TEXT' | 'RANKING';

interface PollManagerProps {
    workshopId?: string;
}

export function PollManager({ workshopId: propWorkshopId }: PollManagerProps = {}) {
    const { session } = useSession();
    const { theme } = useTheme();
    const [polls, setPolls] = useState<Poll[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isResultsOpen, setIsResultsOpen] = useState(false);
    const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
    
    // Use prop workshopId if provided, otherwise fall back to session
    const workshopId = propWorkshopId || session?.workshopId;

    // Create Form State
    const [question, setQuestion] = useState('');
    const [type, setType] = useState<PollType>('MULTIPLE_CHOICE');
    const [options, setOptions] = useState<string[]>(['', '']);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
    const [ratingScale, setRatingScale] = useState<number>(5);

    useEffect(() => {
        if (!workshopId) return;
        loadPolls();

        const onPollCreated = (poll: Poll) => {
            setPolls(prev => [poll, ...prev]);
        };
        const onPollVote = (data: { poll_id: string, total_responses: number, results: any }) => {
            setPolls(prev => prev.map(p => {
                if (p.id === data.poll_id) {
                    return { ...p, stats: { total_responses: data.total_responses, results: data.results } };
                }
                return p;
            }));
            if (selectedPoll?.id === data.poll_id) {
                setSelectedPoll(prev => prev ? { ...prev, stats: { total_responses: data.total_responses, results: data.results } } : null);
            }
        };

        socket.on('poll:created', onPollCreated);
        socket.on('poll:vote', onPollVote);

        return () => {
            socket.off('poll:created', onPollCreated);
            socket.off('poll:vote', onPollVote);
        };
    }, [workshopId, selectedPoll?.id]);

    const loadPolls = async () => {
        if (!workshopId) return;
        try {
            const data = await PollService.getPolls(workshopId);
            setPolls(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddOption = () => setOptions([...options, '']);
    const handleRemoveOption = (idx: number) => setOptions(options.filter((_, i) => i !== idx));
    const handleOptionChange = (idx: number, val: string) => {
        const newOpts = [...options];
        newOpts[idx] = val;
        setOptions(newOpts);
    };

    const handleTypeChange = (newType: PollType) => {
        setType(newType);
        // Reset options based on type
        if (newType === 'YES_NO') {
            setOptions(['Yes', 'No']);
        } else if (newType === 'RATING_SCALE') {
            setOptions([]);
        } else if (newType === 'OPEN_TEXT') {
            setOptions([]);
        } else if (newType === 'RANKING') {
            setOptions(['', '']);
        } else {
            setOptions(['', '']);
        }
    };

    const handleCreate = async () => {
        if (!workshopId) return;
        
        let pollOptions: string[] = [];
        if (type === 'YES_NO') {
            pollOptions = ['Yes', 'No'];
        } else if (type === 'RATING_SCALE') {
            pollOptions = Array.from({ length: ratingScale }, (_, i) => String(i + 1));
        } else if (type === 'OPEN_TEXT') {
            pollOptions = [];
        } else {
            const validOptions = options.filter(o => o.trim() !== '');
            if (validOptions.length < 2) return toast.error("Need at least 2 options");
            pollOptions = validOptions;
        }

        if (!question.trim()) return toast.error("Question is required");

        try {
            await PollService.createPoll(workshopId, {
                question_text: question,
                poll_type: type,
                options: pollOptions,
                is_anonymous: isAnonymous
            });
            
            // Handle timer if set
            if (timerMinutes && timerMinutes > 0) {
                setTimeout(async () => {
                    const createdPoll = polls[0]; // Get the most recent poll
                    if (createdPoll) {
                        await PollService.updateStatus(createdPoll.id, 'CLOSED');
                        toast.info("Poll timer expired - poll closed");
                    }
                }, timerMinutes * 60 * 1000);
            }
            
            setIsCreateOpen(false);
            setQuestion('');
            setType('MULTIPLE_CHOICE');
            setOptions(['', '']);
            setIsAnonymous(false);
            setTimerMinutes(null);
            toast.success("Poll Created");
        } catch (err) {
            toast.error("Failed to create poll");
        }
    };

    const handleExport = () => {
        if (!selectedPoll || !selectedPoll.stats) return;
        
        const csvRows = [
            ['Question', selectedPoll.question_text],
            ['Type', selectedPoll.poll_type],
            ['Total Responses', String(selectedPoll.stats.total_responses)],
            [''],
            ['Option', 'Votes']
        ];
        
        Object.entries(selectedPoll.stats.results || {}).forEach(([option, votes]) => {
            csvRows.push([option, String(votes)]);
        });
        
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `poll_results_${selectedPoll.id}.csv`;
        link.click();
        toast.success("Poll results exported");
    };

    const handleClosePoll = async (pollId: string) => {
        try {
            await PollService.updateStatus(pollId, 'CLOSED');
            setPolls(prev => prev.map(p => p.id === pollId ? { ...p, status: 'CLOSED' } : p));
            toast.success("Poll Closed");
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="theme-bg-secondary rounded-xl border theme-border p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2 theme-text-primary">
                    <BarChart2 className="w-5 h-5 text-brand-violet" />
                    Live Polls
                </h3>
                <Button className="px-3 py-1 text-sm" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> New Poll
                </Button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {polls.length === 0 && <div className="text-sm contrast-muted text-center py-4">No polls created yet</div>}
                {polls.map(poll => (
                    <div key={poll.id} className={`p-3 theme-bg-primary rounded-lg border theme-border transition-colors ${
                        theme === 'light' ? 'hover:border-gray-300' : 'hover:border-white/20'
                    }`}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="font-medium text-sm line-clamp-1 theme-text-primary">{poll.question_text}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${poll.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 contrast-muted'}`}>
                                    {poll.status}
                                </span>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => { setSelectedPoll(poll); setIsResultsOpen(true); }}>
                                    Results
                                </Button>
                                {poll.status === 'ACTIVE' && (
                                    <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => handleClosePoll(poll.id)} title="Close Poll">
                                        <StopCircle className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="text-xs contrast-muted">
                            {poll.stats?.total_responses || 0} responses
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Quick Poll">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm contrast-muted mb-1 block">Question</label>
                        <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="What do you think about...?" />
                    </div>
                    
                    <div>
                        <label className="text-sm contrast-muted mb-1 block">Poll Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'RATING_SCALE', 'YES_NO', 'OPEN_TEXT', 'RANKING'] as PollType[]).map(pollType => (
                                <button
                                    key={pollType}
                                    onClick={() => handleTypeChange(pollType)}
                                    className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                                        type === pollType
                                            ? 'bg-brand-violet/20 border-brand-violet text-brand-violet'
                                            : theme === 'light' 
                                                ? 'bg-gray-100 border-gray-200 hover:border-gray-300 text-gray-700'
                                                : 'theme-bg-tertiary theme-border hover:border-white/20 theme-text-primary'
                                    }`}
                                >
                                    {pollType.replace(/_/g, ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {(type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_SELECT' || type === 'RANKING') && (
                        <div>
                            <label className="text-sm contrast-muted mb-1 block">Options</label>
                            {options.map((opt, idx) => (
                                <div key={idx} className="flex gap-2 mb-2">
                                    <Input value={opt} onChange={e => handleOptionChange(idx, e.target.value)} placeholder={`Option ${idx + 1}`} />
                                    {options.length > 2 && (
                                        <button aria-label="Close" onClick={() => handleRemoveOption(idx)} className={`text-red-400 p-1 rounded ${
                                            theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/5'
                                        }`}>
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <Button variant="ghost" onClick={handleAddOption} className="w-full border-dashed border theme-border px-4 py-2 text-sm">
                                <Plus className="w-4 h-4 mr-2" /> Add Option
                            </Button>
                        </div>
                    )}

                    {type === 'RATING_SCALE' && (
                        <div>
                            <label className="text-sm contrast-muted mb-1 block">Scale (1-N)</label>
                            <select
                                value={ratingScale}
                                onChange={e => setRatingScale(Number(e.target.value))}
                                className={`w-full border rounded-lg px-3 py-2 theme-text-primary ${
                                    theme === 'light' ? 'bg-gray-50 border-gray-200' : 'theme-bg-tertiary theme-border'
                                }`}
                            >
                                <option value={5}>1-5</option>
                                <option value={10}>1-10</option>
                            </select>
                        </div>
                    )}

                    {(type === 'OPEN_TEXT' || type === 'RATING_SCALE') && (
                        <div className={`text-sm contrast-muted p-3 rounded-lg ${
                            theme === 'light' ? 'bg-gray-100' : 'theme-bg-tertiary'
                        }`}>
                            {type === 'OPEN_TEXT' ? 'Participants will provide text responses' : `Participants will rate from 1 to ${ratingScale}`}
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm contrast-muted cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={e => setIsAnonymous(e.target.checked)}
                                className={`rounded ${theme === 'light' ? 'border-gray-300 bg-white' : 'border-gray-600 bg-surface-700'}`}
                            />
                            Anonymous responses
                        </label>
                    </div>

                    <div>
                        <label className="text-sm contrast-muted mb-1 block flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Auto-close timer (optional, minutes)
                        </label>
                        <Input
                            type="number"
                            min="1"
                            max="60"
                            value={timerMinutes || ''}
                            onChange={e => setTimerMinutes(e.target.value ? Number(e.target.value) : null)}
                            placeholder="e.g. 5"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={!question}>Launch Poll</Button>
                    </div>
                </div>
            </Modal>

            {/* Results Modal */}
            <Modal isOpen={isResultsOpen} onClose={() => setIsResultsOpen(false)} title="Poll Results">
                {selectedPoll && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-medium theme-text-primary">{selectedPoll.question_text}</h3>
                            <Button variant="ghost" onClick={handleExport} className="text-sm">
                                <Download className="w-4 h-4 mr-2" /> Export
                            </Button>
                        </div>
                        
                        <div className="h-64 w-full">
                            {selectedPoll.poll_type === 'OPEN_TEXT' ? (
                                <div className="h-full overflow-y-auto space-y-2">
                                    {Object.entries(selectedPoll.stats?.results || {}).map(([response, count]: [string, any]) => (
                                        <div key={response} className={`p-2 rounded text-sm ${
                                            theme === 'light' ? 'bg-gray-100' : 'theme-bg-tertiary'
                                        }`}>
                                            <div className="font-medium theme-text-primary">{response}</div>
                                            <div className="text-xs contrast-muted">{count} {count === 1 ? 'vote' : 'votes'}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    {selectedPoll.poll_type === 'RATING_SCALE' || selectedPoll.poll_type === 'YES_NO' ? (
                                        <PieChart>
                                            <Pie
                                                data={Object.entries(selectedPoll.stats?.results || {}).map(([name, value]) => ({ name, value }))}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {Object.entries(selectedPoll.stats?.results || {}).map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'][index % 5]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    ) : (
                                        <BarChart data={Object.entries(selectedPoll.stats?.results || {}).map(([name, value]) => ({ name, value }))}>
                                            <XAxis dataKey="name" stroke={theme === 'light' ? '#6b7280' : '#888'} fontSize={12} />
                                            <YAxis stroke={theme === 'light' ? '#6b7280' : '#888'} allowDecimals={false} />
                                            <Tooltip
                                                contentStyle={{ 
                                                    backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a', 
                                                    border: theme === 'light' ? '1px solid #e5e7eb' : '1px solid #333',
                                                    color: theme === 'light' ? '#1f2937' : '#ffffff'
                                                }}
                                                cursor={{ fill: 'transparent' }}
                                            />
                                            <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]}>
                                                {Object.entries(selectedPoll.stats?.results || {}).map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#ec4899', '#8b5cf6', '#3b82f6', '#10b981'][index % 4]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="text-center text-sm contrast-muted">
                            Total Votes: {selectedPoll.stats?.total_responses || 0}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
