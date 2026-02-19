import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PollService } from '../../lib/api/polls';
import type { Question } from '../../lib/api/polls';
import { useSession } from '../../context/SessionContext';
import { socket } from '../../lib/socket';
import { MessageSquare, ThumbsUp, Check, Star } from 'lucide-react';
import { toast } from 'sonner';

interface QAPanelProps {
    className?: string;
    workshopId?: string;
}

export function QAPanel({ className, workshopId: workshopIdProp }: QAPanelProps) {
    const { session } = useSession();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [newQuestion, setNewQuestion] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);

    const workshopId = workshopIdProp || session?.workshopId;

    const isFacilitator = session?.role === 'FACILITATOR' || session?.role === 'ADMIN';

    useEffect(() => {
        if (!workshopId) return;
        loadQuestions();

        const onQuestionSubmitted = (q: Question) => {
            // Participants only see their own questions; facilitators see all
            if (isFacilitator || q.participant_id === session?.participantId) {
                setQuestions(prev => [q, ...prev]);
            }
        };
        const onQuestionUpvoted = (data: { question_id: string, votes: number }) => {
            setQuestions(prev => prev.map(q => q.id === data.question_id ? { ...q, upvote_count: data.votes } : q));
        };
        const onQuestionUpdated = (data: { question_id: string, is_answered: boolean, is_pinned: boolean }) => {
            setQuestions(prev => prev.map(q => q.id === data.question_id ? { ...q, is_answered: data.is_answered, is_pinned: data.is_pinned } : q));
        };

        socket.on('question:submitted', onQuestionSubmitted);
        socket.on('question:upvoted', onQuestionUpvoted);
        socket.on('question:updated', onQuestionUpdated);

        return () => {
            socket.off('question:submitted', onQuestionSubmitted);
            socket.off('question:upvoted', onQuestionUpvoted);
            socket.off('question:updated', onQuestionUpdated);
        };
    }, [workshopId]);

    const loadQuestions = async () => {
        if (!workshopId) return;
        try {
            // Participants only fetch their own questions; facilitators fetch all
            const data = await PollService.getQuestions(workshopId, session?.participantId, !isFacilitator);
            setQuestions(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newQuestion.trim() || !session?.participantId || !workshopId) return;

        try {
            await PollService.submitQuestion(workshopId, session.participantId, newQuestion, isAnonymous);
            setNewQuestion('');
            toast.success("Question submitted");
        } catch (err) {
            toast.error("Failed to submit question");
        }
    };

    const handleUpvote = async (id: string) => {
        if (!session?.participantId) return;
        // Optimistic update
        setQuestions(prev => prev.map(q => {
            if (q.id === id) {
                return {
                    ...q,
                    upvote_count: q.user_has_upvoted ? q.upvote_count - 1 : q.upvote_count + 1,
                    user_has_upvoted: !q.user_has_upvoted
                };
            }
            return q;
        }));

        try {
            await PollService.upvoteQuestion(id, session.participantId);
        } catch (err) {
            // Revert on error could be implemented but rare
        }
    };

    // Admin only actions
    const handleUpdate = async (id: string, update: any) => {
        try {
            await PollService.updateQuestion(id, update);
        } catch (err) {
            toast.error("Failed to update question");
        }
    };

    const sortedQuestions = [...questions].sort((a, b) => {
        // Pinned first
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        // Then by votes
        return b.upvote_count - a.upvote_count;
    });

    return (
        <div className={`flex flex-col h-full theme-bg-primary ${className}`}>
            <div className="p-4 border-b theme-border">
                <h3 className="font-bold flex items-center gap-2 theme-text-primary">
                    <MessageSquare className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
                    Q&A ({questions.length})
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {sortedQuestions.map(q => (
                    <div key={q.id} className={`p-3 rounded-lg border ${q.is_pinned ? 'border-yellow-500/50' : 'theme-border'} ${q.is_answered ? 'opacity-60' : ''}`} style={{ backgroundColor: q.is_pinned ? 'var(--theme-bg-tertiary)' : 'var(--theme-bg-secondary)' }}>
                        <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                                <p className="text-sm theme-text-primary">{q.content}</p>
                                <div className="mt-2 flex items-center justify-between text-xs contrast-muted">
                                    <span>{q.display_name}</span>
                                    <span>{new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <button
                                    onClick={() => handleUpvote(q.id)}
                                    className={`p-1 rounded hover:opacity-80 flex flex-col items-center min-w-[30px] ${q.user_has_upvoted ? '' : 'contrast-muted'}`}
                                    style={q.user_has_upvoted ? { color: 'var(--theme-accent)' } : {}}
                                >
                                    <ThumbsUp className="w-4 h-4" />
                                    <span className="text-xs font-bold">{q.upvote_count}</span>
                                </button>

                                {isFacilitator && (
                                    <div className="flex flex-col gap-1 mt-1">
                                        <button
                                            onClick={() => handleUpdate(q.id, { is_pinned: !q.is_pinned })}
                                            className={`p-1 rounded ${q.is_pinned ? 'text-yellow-400' : 'contrast-muted hover:theme-text-secondary'}`}
                                            title="Pin"
                                        >
                                            <Star className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => handleUpdate(q.id, { is_answered: !q.is_answered })}
                                            className={`p-1 rounded ${q.is_answered ? 'text-green-400' : 'contrast-muted hover:theme-text-secondary'}`}
                                            title="Mark Answered"
                                        >
                                            <Check className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t theme-border theme-bg-secondary">
                <form onSubmit={handleSubmit} className="space-y-2">
                    <Input
                        value={newQuestion}
                        onChange={e => setNewQuestion(e.target.value)}
                        placeholder="Ask a question..."
                        className="theme-input"
                    />
                    <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2 text-xs contrast-muted cursor-pointer hover:theme-text-primary">
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={e => setIsAnonymous(e.target.checked)}
                                className="rounded theme-border theme-bg-tertiary"
                            />
                            Ask anonymously
                        </label>
                        <Button type="submit" className="px-4 py-1.5 text-sm" disabled={!newQuestion.trim()}>
                            Send
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
