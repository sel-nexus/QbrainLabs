import React, { useState, useEffect, useMemo } from 'react';
import { PollService, type Poll } from '../../lib/api/polls';
import { useSession } from '../../context/SessionContext';
import { socket } from '../../lib/socket';
import { RefreshCw } from 'lucide-react';

interface WordCloudProps {
    pollId: string;
    className?: string;
}

interface WordData {
    text: string;
    count: number;
    size: number;
}

export function WordCloud({ pollId, className }: WordCloudProps) {
    const { session } = useSession();
    const [poll, setPoll] = useState<Poll | null>(null);
    const [words, setWords] = useState<WordData[]>([]);

    useEffect(() => {
        if (!session?.workshopId) return;
        loadPollData();

        const interval = setInterval(loadPollData, 5000); // Refresh every 5 seconds

        const onPollVote = (data: { poll_id: string, total_responses: number, results: any }) => {
            if (data.poll_id === pollId) {
                loadPollData();
            }
        };

        socket.on('poll:vote', onPollVote);

        return () => {
            clearInterval(interval);
            socket.off('poll:vote', onPollVote);
        };
    }, [pollId, session?.workshopId]);

    const loadPollData = async () => {
        if (!session?.workshopId) return;
        try {
            const polls = await PollService.getPolls(session.workshopId);
            const foundPoll = polls.find(p => p.id === pollId);
            if (foundPoll && foundPoll.poll_type === 'OPEN_TEXT') {
                setPoll(foundPoll);
                processWords(foundPoll);
            }
        } catch (err) {
            console.error('Failed to load poll data:', err);
        }
    };

    const processWords = (pollData: Poll) => {
        if (!pollData.stats?.results) return;

        // Extract all text responses
        const allTexts: string[] = [];
        Object.entries(pollData.stats.results).forEach(([text, count]: [string, any]) => {
            for (let i = 0; i < count; i++) {
                allTexts.push(text);
            }
        });

        // Split into words and count
        const wordCounts: Record<string, number> = {};
        const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how']);

        allTexts.forEach(text => {
            const words = text.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(word => word.length > 2 && !commonWords.has(word));

            words.forEach(word => {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            });
        });

        // Convert to array and sort
        const wordArray: WordData[] = Object.entries(wordCounts)
            .map(([text, count]) => ({
                text,
                count,
                size: Math.min(20 + count * 3, 48) // Size between 20-48px
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 50); // Top 50 words

        setWords(wordArray);
    };

    const getColor = (index: number) => {
        const colors = [
            'text-pink-400', 'text-purple-400', 'text-blue-400', 'text-green-400',
            'text-yellow-400', 'text-orange-400', 'text-red-400', 'text-indigo-400'
        ];
        return colors[index % colors.length];
    };

    return (
        <div className={`bg-surface-800 rounded-xl border border-white/10 p-6 ${className}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Word Cloud</h3>
                <button
                    onClick={loadPollData}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>
            {words.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p>No words yet. Waiting for responses...</p>
                </div>
            ) : (
                <div className="flex flex-wrap gap-3 items-center justify-center min-h-[200px]">
                    {words.map((word, idx) => (
                        <span
                            key={`${word.text}-${idx}`}
                            className={`${getColor(idx)} font-medium hover:scale-110 transition-transform cursor-pointer`}
                            style={{ fontSize: `${word.size}px` }}
                            title={`${word.text}: ${word.count} occurrences`}
                        >
                            {word.text}
                        </span>
                    ))}
                </div>
            )}
            {poll && (
                <div className="mt-4 text-center text-sm text-gray-400">
                    {poll.stats?.total_responses || 0} responses
                </div>
            )}
        </div>
    );
}
