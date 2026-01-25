import React, { useState } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { feedbackApi, FeedbackType, type FeedbackData } from '../../lib/api/feedback';
import { toast } from 'sonner';

export const FeedbackWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [type, setType] = useState<FeedbackType>(FeedbackType.GENERAL);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description) return;

        setIsSubmitting(true);
        try {
            await feedbackApi.submitFeedback({
                type,
                title,
                description,
                page_url: window.location.pathname
            });
            toast.success('Feedback submitted successfully!');
            setIsOpen(false);
            // Reset form
            setTitle('');
            setDescription('');
            setType(FeedbackType.GENERAL);
        } catch (error) {
            toast.error('Failed to submit feedback');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all hover:scale-105"
                aria-label="Give Feedback"
            >
                <MessageSquare size={24} />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="p-4 bg-blue-600 flex items-center justify-between text-white">
                <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare size={18} />
                    Send Feedback
                </h3>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-blue-700 rounded transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Feedback Type
                    </label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as FeedbackType)}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                    >
                        <option value={FeedbackType.GENERAL}>General Feedback</option>
                        <option value={FeedbackType.BUG}>Report a Bug</option>
                        <option value={FeedbackType.FEATURE_REQUEST}>Feature Request</option>
                        <option value={FeedbackType.IMPROVEMENT}>Improvement Idea</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Title
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Short summary"
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                        required
                        maxLength={100}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell us more details..."
                        rows={4}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 resize-none"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            Send Feedback
                            <Send size={16} />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
