import React, { useState, useEffect } from 'react';
import { type Poll, PollService } from '../../lib/api/polls';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useSession } from '../../context/SessionContext';
import { useTheme } from '../../context/ThemeContext';
import { socket } from '../../lib/socket';
import { toast } from 'sonner';
import { CheckCircle, Circle, GripVertical, X } from 'lucide-react';
import { errorMessage } from '../../lib/apiErrors';
import { AnimatePresence, motion } from 'framer-motion';

export function PollResponder() {
    const { session } = useSession();
    const { theme } = useTheme();
    const [activePolls, setActivePolls] = useState<Poll[]>([]);
    const [textResponses, setTextResponses] = useState<Record<string, string>>({});
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
    const [rankings, setRankings] = useState<Record<string, string[]>>({});
    // Polls the participant chose to skip; they stay hidden for this visit.
    const [dismissed, setDismissed] = useState<string[]>([]);

    useEffect(() => {
        if (!session?.workshopId || !session.participantId) return;
        loadActivePolls();

        const onPollCreated = (poll: Poll) => {
            // Add new poll if active
            if (poll.status === 'ACTIVE') {
                setActivePolls(prev => [poll, ...prev]);
                toast("New poll available!", {
                    description: poll.question_text,
                    action: { label: "View", onClick: () => { } }
                });
            }
        };

        const onPollStatus = (data: { poll_id: string, status: string }) => {
            setActivePolls(prev => prev.map(p => p.id === data.poll_id ? { ...p, status: data.status as any } : p));
        };

        const onPollVote = (data: { poll_id: string, total_responses: number, results: any }) => {
            setActivePolls(prev => prev.map(p => {
                if (p.id === data.poll_id) {
                    return { ...p, stats: { total_responses: data.total_responses, results: data.results } };
                }
                return p;
            }));
        };

        socket.on('poll:created', onPollCreated);
        socket.on('poll:status', onPollStatus);
        socket.on('poll:vote', onPollVote);

        return () => {
            socket.off('poll:created', onPollCreated);
            socket.off('poll:status', onPollStatus);
            socket.off('poll:vote', onPollVote);
        };
    }, [session]);

    const loadActivePolls = async () => {
        if (!session?.workshopId || !session?.participantId) return;
        try {
            const data = await PollService.getPolls(session.workshopId, session.participantId);
            // Filter only active for participants or those they voted in? 
            // Usually just active ones to vote on.
            // But if we want to show results of closed ones, we keep them.
            // The API returns all, let's filter or sort.
            setActivePolls(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleVote = async (pollId: string, value: any) => {
        if (!session?.participantId) return;
        try {
            await PollService.vote(pollId, session.participantId, value);
            // Optimistic update
            setActivePolls(prev => prev.map(p => {
                if (p.id === pollId) {
                    return { ...p, user_response: value };
                }
                return p;
            }));
            toast.success("Vote recorded");
        } catch (err: any) {
            console.error('Failed to vote on poll:', err);
            toast.error(err?.response?.status === 404 ? 'This poll is no longer active.' : errorMessage(err, 'Failed to submit your vote. Please try again.'));
        }
    };

    const handleMultipleSelect = (pollId: string, option: string) => {
        const current = selectedOptions[pollId] || [];
        const updated = current.includes(option)
            ? current.filter(o => o !== option)
            : [...current, option];
        setSelectedOptions({ ...selectedOptions, [pollId]: updated });
    };

    const handleSubmitMultipleSelect = async (pollId: string) => {
        const selected = selectedOptions[pollId] || [];
        if (selected.length === 0) {
            toast.error("Please select at least one option");
            return;
        }
        await handleVote(pollId, selected);
        setSelectedOptions({ ...selectedOptions, [pollId]: [] });
    };

    const handleTextSubmit = async (pollId: string) => {
        const text = textResponses[pollId]?.trim();
        if (!text) {
            toast.error("Please enter a response");
            return;
        }
        await handleVote(pollId, text);
        setTextResponses({ ...textResponses, [pollId]: '' });
    };

    const handleRankingMove = (pollId: string, option: string, direction: 'up' | 'down', pollOptions: string[]) => {
        const current = rankings[pollId] || pollOptions || [];
        const index = current.indexOf(option);
        if (index === -1) return;
        
        const newRanking = [...current];
        if (direction === 'up' && index > 0) {
            [newRanking[index - 1], newRanking[index]] = [newRanking[index], newRanking[index - 1]];
        } else if (direction === 'down' && index < newRanking.length - 1) {
            [newRanking[index], newRanking[index + 1]] = [newRanking[index + 1], newRanking[index]];
        }
        setRankings({ ...rankings, [pollId]: newRanking });
    };

    const handleRankingSubmit = async (pollId: string, pollOptions: string[]) => {
        const ranking = rankings[pollId] || pollOptions || [];
        await handleVote(pollId, ranking);
    };

    const visiblePolls = activePolls.filter(p => p.status === 'ACTIVE' && !p.user_response && !dismissed.includes(p.id));
    if (visiblePolls.length === 0) {
        return null;
    }

    const renderPollContent = (poll: Poll) => {
        if (poll.poll_type === 'MULTIPLE_CHOICE' || poll.poll_type === 'YES_NO') {
            return (
                <div className="space-y-2">
                    {poll.options.map((opt: string, idx: number) => (
                        <button
                            key={idx}
                            onClick={() => handleVote(poll.id, opt)}
                            className="w-full text-left px-3 py-2 rounded-lg theme-bg-tertiary hover:theme-bg-secondary theme-border border transition-colors text-sm flex items-center gap-2 theme-text-primary"
                        >
                            <Circle className="w-4 h-4" />
                            {opt}
                        </button>
                    ))}
                </div>
            );
        }

        if (poll.poll_type === 'MULTIPLE_SELECT') {
            const selected = selectedOptions[poll.id] || [];
            return (
                <div className="space-y-3">
                    {poll.options.map((opt: string, idx: number) => (
                        <label
                            key={idx}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg theme-bg-tertiary hover:theme-bg-secondary theme-border border cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={selected.includes(opt)}
                                onChange={() => handleMultipleSelect(poll.id, opt)}
                                className="rounded theme-border"
                            />
                            <span className="text-sm theme-text-primary">{opt}</span>
                        </label>
                    ))}
                    <Button onClick={() => handleSubmitMultipleSelect(poll.id)} className="w-full mt-2" disabled={selected.length === 0}>
                        Submit ({selected.length} selected)
                    </Button>
                </div>
            );
        }

        if (poll.poll_type === 'RATING_SCALE') {
            const scale = poll.options.length || 5;
            return (
                <div className="space-y-3">
                    <div className="flex justify-between text-xs theme-text-secondary mb-2">
                        <span>1</span>
                        <span>{scale}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {Array.from({ length: scale }, (_, i) => i + 1).map((rating) => (
                            <button
                                key={rating}
                                onClick={() => handleVote(poll.id, String(rating))}
                                className="flex-1 min-w-[50px] px-3 py-2 rounded-lg theme-bg-tertiary hover:bg-brand-violet hover:text-white theme-border border transition-colors text-sm font-bold theme-text-primary"
                            >
                                {rating}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        if (poll.poll_type === 'OPEN_TEXT') {
            return (
                <div className="space-y-2">
                    <Input
                        value={textResponses[poll.id] || ''}
                        onChange={e => setTextResponses({ ...textResponses, [poll.id]: e.target.value })}
                        placeholder="Type your response..."
                    />
                    <Button onClick={() => handleTextSubmit(poll.id)} className="w-full" disabled={!textResponses[poll.id]?.trim()}>
                        Submit
                    </Button>
                </div>
            );
        }

        if (poll.poll_type === 'RANKING') {
            const pollOptions = poll.options || [];
            const currentRanking = rankings[poll.id] || pollOptions;
            return (
                <div className="space-y-2">
                    {currentRanking.map((opt: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 p-2 theme-bg-tertiary rounded-lg">
                            <GripVertical className="w-4 h-4 theme-text-secondary" />
                            <span className="flex-1 text-sm theme-text-primary">{opt}</span>
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => handleRankingMove(poll.id, opt, 'up', pollOptions)}
                                    disabled={idx === 0}
                                    className="text-xs px-2 py-0.5 rounded theme-bg-secondary disabled:opacity-30 theme-text-primary"
                                >
                                    ↑
                                </button>
                                <button
                                    onClick={() => handleRankingMove(poll.id, opt, 'down', pollOptions)}
                                    disabled={idx === currentRanking.length - 1}
                                    className="text-xs px-2 py-0.5 rounded theme-bg-secondary disabled:opacity-30 theme-text-primary"
                                >
                                    ↓
                                </button>
                            </div>
                        </div>
                    ))}
                    <Button onClick={() => handleRankingSubmit(poll.id, pollOptions)} className="w-full mt-2">
                        Submit Ranking
                    </Button>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="fixed bottom-24 right-4 w-80 max-w-[90vw] z-40 space-y-2">
            <AnimatePresence>
                {visiblePolls.map(poll => (
                    <motion.div
                        key={poll.id}
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="theme-bg-primary theme-border border shadow-2xl rounded-xl p-4 overflow-hidden relative"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-500" />
                        <button
                            type="button"
                            onClick={() => setDismissed(prev => [...prev, poll.id])}
                            aria-label="Skip this poll"
                            className="absolute top-2 right-2 p-1.5 rounded-full theme-text-secondary hover:theme-bg-tertiary"
                        >
                            <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <h4 className="font-bold mb-3 mt-1 pr-6 theme-text-primary">{poll.question_text}</h4>
                        {renderPollContent(poll)}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
