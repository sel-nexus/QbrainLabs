import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Star, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';

interface AIFeedbackProps {
    endpoint: string;
    requestData: Record<string, any>;
    responseData: Record<string, any>;
    responseTimeMs?: number;
    workshopId?: string;
    useCaseId?: string;
    onFeedbackSubmitted?: () => void;
}

export default function AIFeedback({
    endpoint,
    requestData,
    responseData,
    responseTimeMs,
    workshopId,
    useCaseId,
    onFeedbackSubmitted
}: AIFeedbackProps) {
    const [rating, setRating] = useState<number | null>(null);
    const [isHelpful, setIsHelpful] = useState<boolean | null>(null);
    const [feedbackText, setFeedbackText] = useState('');
    const [showTextInput, setShowTextInput] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmitFeedback = async () => {
        if (!rating && isHelpful === null && !feedbackText) {
            toast.error('Please provide some feedback');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('rag/feedback', {
                endpoint,
                request_data: requestData,
                response_data: responseData,
                rating,
                is_helpful: isHelpful,
                feedback_text: feedbackText || null,
                response_time_ms: responseTimeMs,
                workshop_id: workshopId,
                use_case_id: useCaseId
            });

            toast.success('Thank you for your feedback!');
            setSubmitted(true);

            if (onFeedbackSubmitted) {
                onFeedbackSubmitted();
            }
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            toast.error('Failed to submit feedback');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <ThumbsUp className="w-4 h-4" />
                <span>Thanks for your feedback!</span>
            </div>
        );
    }

    return (
        <div className="space-y-3 p-3 bg-gray-50 dark:bg-surface-800 rounded-lg border border-gray-200 dark:border-white/10">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                How was this AI response?
            </div>

            {/* Star Rating */}
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        aria-label={`Rate ${star} out of 5`}
                        aria-pressed={!!rating && star <= rating}
                        onClick={() => setRating(star)}
                        className={`p-1 rounded transition ${rating && star <= rating
                            ? 'text-yellow-500'
                            : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'
                            }`}
                        disabled={submitting}
                    >
                        <Star
                            className="w-5 h-5"
                            fill={rating && star <= rating ? 'currentColor' : 'none'}
                        />
                    </button>
                ))}
            </div>

            {/* Helpful/Not Helpful */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsHelpful(true)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition ${isHelpful === true
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-white dark:bg-surface-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-600'
                        }`}
                    disabled={submitting}
                >
                    <ThumbsUp className="w-4 h-4" />
                    Helpful
                </button>

                <button
                    onClick={() => setIsHelpful(false)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition ${isHelpful === false
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : 'bg-white dark:bg-surface-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-600'
                        }`}
                    disabled={submitting}
                >
                    <ThumbsDown className="w-4 h-4" />
                    Not Helpful
                </button>

                <button
                    onClick={() => setShowTextInput(!showTextInput)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-surface-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-600 transition"
                    disabled={submitting}
                >
                    <MessageSquare className="w-4 h-4" />
                    Comment
                </button>
            </div>

            {/* Text Feedback */}
            {showTextInput && (
                <div className="space-y-2">
                    <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Tell us more about your experience..."
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-surface-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        rows={3}
                        disabled={submitting}
                    />
                </div>
            )}

            {/* Submit Button */}
            {(rating || isHelpful !== null || feedbackText) && (
                <button
                    onClick={handleSubmitFeedback}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            Submit Feedback
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
