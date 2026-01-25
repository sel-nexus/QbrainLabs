import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { MessageSquare, ChevronRight, Loader2, Copy, Check } from 'lucide-react';
import { getDiscussionPrompts } from '../../lib/api/copilot';
import type { DiscussionPromptsResponse } from '../../lib/api/copilot';
import { toast } from 'sonner';

interface DiscussionPromptsProps {
    useCaseId: string;
    useCaseTitle?: string;
    className?: string;
}

export function DiscussionPrompts({ useCaseId, useCaseTitle, className = '' }: DiscussionPromptsProps) {
    const { theme } = useTheme();
    const [prompts, setPrompts] = useState<DiscussionPromptsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedPrompt, setExpandedPrompt] = useState<number | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    useEffect(() => {
        const fetchPrompts = async () => {
            try {
                const data = await getDiscussionPrompts(useCaseId);
                setPrompts(data);
            } catch (err) {
                console.error('Failed to fetch discussion prompts:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPrompts();
    }, [useCaseId]);

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const categoryColors: Record<string, string> = {
        implementation: theme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400',
        stakeholders: theme === 'light' ? 'bg-green-100 text-green-700' : 'bg-green-900/30 text-green-400',
        data: theme === 'light' ? 'bg-purple-100 text-purple-700' : 'bg-purple-900/30 text-purple-400',
        strategic: theme === 'light' ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-900/30 text-yellow-400',
        alignment: theme === 'light' ? 'bg-red-100 text-red-700' : 'bg-red-900/30 text-red-400',
    };

    if (loading) {
        return (
            <div className={`flex items-center justify-center p-6 ${className}`}>
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!prompts || prompts.prompts.length === 0) {
        return (
            <div className={`p-4 text-center ${className}`}>
                <MessageSquare className={`w-8 h-8 mx-auto mb-2 ${
                    theme === 'light' ? 'text-gray-300' : 'text-gray-600'
                }`} />
                <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                    No discussion prompts available
                </p>
            </div>
        );
    }

    return (
        <div className={`space-y-3 ${className}`}>
            {useCaseTitle && (
                <h4 className={`text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                }`}>
                    Discussion prompts for: {useCaseTitle}
                </h4>
            )}
            
            {prompts.prompts.map((prompt, index) => (
                <div
                    key={index}
                    className={`rounded-lg border ${
                        theme === 'light'
                            ? 'border-gray-200 bg-white'
                            : 'border-white/10 bg-surface-800'
                    }`}
                >
                    <button
                        onClick={() => setExpandedPrompt(expandedPrompt === index ? null : index)}
                        className="w-full p-3 flex items-start gap-3 text-left"
                    >
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            categoryColors[prompt.category] || categoryColors.implementation
                        }`}>
                            {prompt.category}
                        </span>
                        
                        <div className="flex-1">
                            <p className={`text-sm ${
                                theme === 'light' ? 'text-gray-900' : 'text-white'
                            }`}>
                                {prompt.question}
                            </p>
                        </div>
                        
                        <ChevronRight className={`w-4 h-4 transition-transform ${
                            expandedPrompt === index ? 'rotate-90' : ''
                        } ${theme === 'light' ? 'text-gray-400' : 'text-gray-500'}`} />
                    </button>
                    
                    {expandedPrompt === index && prompt.follow_up && (
                        <div className={`px-3 pb-3 ${
                            theme === 'light' ? 'border-t border-gray-100' : 'border-t border-white/5'
                        }`}>
                            <div className={`mt-3 p-3 rounded-lg ${
                                theme === 'light' ? 'bg-gray-50' : 'bg-surface-700'
                            }`}>
                                <p className={`text-xs font-medium mb-1 ${
                                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                    Follow-up:
                                </p>
                                <p className={`text-sm ${
                                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                }`}>
                                    {prompt.follow_up}
                                </p>
                            </div>
                            
                            <div className="mt-2 flex justify-end">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(`${prompt.question}\n\nFollow-up: ${prompt.follow_up}`, index);
                                    }}
                                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                                        theme === 'light'
                                            ? 'text-gray-500 hover:bg-gray-100'
                                            : 'text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    {copiedIndex === index ? (
                                        <>
                                            <Check className="w-3 h-3" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3 h-3" />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
