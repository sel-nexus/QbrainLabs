import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { Loader2, Save, X, MessageSquare, Edit2, Eye } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface UseCase {
    id: string;
    title: string;
    description: string;
    proposed_solution?: string;
    kpi?: string;
    target_user?: string;
    category?: string;
    participant_id?: string;
    created_at?: string;
}

interface UseCaseDetailModalProps {
    useCase: UseCase | null;
    participantId: string;
    isOwner: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

export function UseCaseDetailModal({
    useCase,
    participantId,
    isOwner,
    onClose,
    onUpdate
}: UseCaseDetailModalProps) {
    const { theme } = useTheme();
    const [isEditing, setIsEditing] = useState(isOwner);
    const [formData, setFormData] = useState<UseCase | null>(null);
    const [feedback, setFeedback] = useState('');
    const [existingFeedback, setExistingFeedback] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [loadingFeedback, setLoadingFeedback] = useState(false);

    useEffect(() => {
        if (useCase) {
            setFormData(useCase);
            if (!isOwner) {
                loadFeedback();
            }
        }
    }, [useCase, isOwner]);

    const loadFeedback = async () => {
        if (!useCase?.id) return;
        try {
            setLoadingFeedback(true);
            const { data } = await api.get(`/usecases/${useCase.id}/feedback`, {
                params: { participant_id: participantId }
            });
            if (data && data.feedback_text) {
                setExistingFeedback(data.feedback_text);
                setFeedback(data.feedback_text);
            }
        } catch (error: any) {
            // If no feedback exists, that's okay
            if (error.response?.status !== 404) {
                console.error('Failed to load feedback:', error);
            }
        } finally {
            setLoadingFeedback(false);
        }
    };

    const handleSave = async () => {
        if (!formData || !useCase) return;

        // Validate required fields
        if (!formData.title || !formData.description) {
            toast.error('Title and description are required');
            return;
        }

        try {
            setSubmitting(true);
            await api.put(`/usecases/${useCase.id}`, {
                title: formData.title,
                description: formData.description,
                proposed_solution: formData.proposed_solution || '',
                kpi: formData.kpi || '',
                target_user: formData.target_user || '',
                category: formData.category || 'Generative AI'
            });

            toast.success('Use case updated successfully');
            setIsEditing(false);
            if (onUpdate) {
                onUpdate();
            }
        } catch (error: any) {
            console.error('Failed to update use case:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Failed to update use case';
            toast.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitFeedback = async () => {
        if (!useCase || !feedback.trim()) {
            toast.error('Please enter feedback');
            return;
        }

        if (feedback.length > 500) {
            toast.error('Feedback must be 500 characters or less');
            return;
        }

        try {
            setSubmitting(true);
            await api.post(`/usecases/${useCase.id}/feedback`, {
                feedback_text: feedback.trim()
            }, {
                params: { participant_id: participantId }
            });

            toast.success('Feedback submitted successfully');
            setExistingFeedback(feedback);
            if (onUpdate) {
                onUpdate();
            }
        } catch (error: any) {
            console.error('Failed to submit feedback:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Failed to submit feedback';
            toast.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (!useCase || !formData) {
        return null;
    }

    return (
        <Modal isOpen={true} onClose={onClose} title="Use Case Details" size="large">
            <div className="space-y-6">
                {/* Owner Badge */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium w-fit ${
                    isOwner 
                        ? 'bg-brand-violet/20 text-brand-violet' 
                        : 'theme-bg-tertiary theme-text-secondary'
                }`}>
                    {isOwner ? (
                        <>
                            <Edit2 className="w-4 h-4" />
                            Your Use Case
                        </>
                    ) : (
                        <>
                            <Eye className="w-4 h-4" />
                            View Only
                        </>
                    )}
                </div>

                {/* Title */}
                <div>
                    <label className="text-sm font-medium theme-text-secondary mb-1.5 block">
                        Title
                    </label>
                    {isEditing ? (
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Use case title"
                        />
                    ) : (
                        <div className="px-4 py-3 rounded-lg theme-bg-tertiary theme-text-primary">
                            {formData.title}
                        </div>
                    )}
                </div>

                {/* Description */}
                <div>
                    <label className="text-sm font-medium theme-text-secondary mb-1.5 block">
                        Problem Statement
                    </label>
                    {isEditing ? (
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe the problem..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-lg theme-input-bg theme-border border theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-violet resize-none"
                        />
                    ) : (
                        <div className="px-4 py-3 rounded-lg theme-bg-tertiary theme-text-primary whitespace-pre-wrap">
                            {formData.description}
                        </div>
                    )}
                </div>

                {/* Proposed Solution */}
                <div>
                    <label className="text-sm font-medium theme-text-secondary mb-1.5 block">
                        Proposed Solution
                    </label>
                    {isEditing ? (
                        <textarea
                            value={formData.proposed_solution || ''}
                            onChange={(e) => setFormData({ ...formData, proposed_solution: e.target.value })}
                            placeholder="How does AI solve it?"
                            rows={4}
                            className="w-full px-4 py-3 rounded-lg theme-input-bg theme-border border theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-violet resize-none"
                        />
                    ) : (
                        <div className="px-4 py-3 rounded-lg theme-bg-tertiary theme-text-primary whitespace-pre-wrap">
                            {formData.proposed_solution || 'Not specified'}
                        </div>
                    )}
                </div>

                {/* Grid for KPI, Target User, Category */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm font-medium theme-text-secondary mb-1.5 block">
                            Expected Benefit (KPI)
                        </label>
                        {isEditing ? (
                            <Input
                                value={formData.kpi || ''}
                                onChange={(e) => setFormData({ ...formData, kpi: e.target.value })}
                                placeholder="e.g. Reduce handle time by 20%"
                            />
                        ) : (
                            <div className="px-4 py-3 rounded-lg theme-bg-tertiary theme-text-primary">
                                {formData.kpi || 'Not specified'}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium theme-text-secondary mb-1.5 block">
                            Target User
                        </label>
                        {isEditing ? (
                            <Input
                                value={formData.target_user || ''}
                                onChange={(e) => setFormData({ ...formData, target_user: e.target.value })}
                                placeholder="e.g. Support Agents"
                            />
                        ) : (
                            <div className="px-4 py-3 rounded-lg theme-bg-tertiary theme-text-primary">
                                {formData.target_user || 'Not specified'}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium theme-text-secondary mb-1.5 block">
                            AI Technique
                        </label>
                        {isEditing ? (
                            <select
                                value={formData.category || 'Generative AI'}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg theme-input-bg theme-border border theme-text-primary focus:outline-none focus:ring-2 focus:ring-brand-violet"
                            >
                                <option>Generative AI</option>
                                <option>Predictive ML</option>
                                <option>Computer Vision</option>
                                <option>Robotics</option>
                                <option>Other</option>
                            </select>
                        ) : (
                            <div className="px-4 py-3 rounded-lg theme-bg-tertiary theme-text-primary">
                                {formData.category || 'Not specified'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Feedback Section (for non-owners) */}
                {!isOwner && (
                    <div>
                        <label className="text-sm font-medium theme-text-secondary mb-1.5 block flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Your Feedback
                        </label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Share your thoughts on this use case..."
                            rows={4}
                            maxLength={500}
                            className="w-full px-4 py-3 rounded-lg theme-input-bg theme-border border theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-violet resize-none"
                        />
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-xs theme-text-secondary">
                                {feedback.length}/500 characters
                            </span>
                            {existingFeedback && (
                                <span className="text-xs theme-text-secondary">
                                    Previously submitted feedback will be updated
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t theme-border">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        {isOwner && isEditing ? 'Cancel' : 'Close'}
                    </Button>
                    {isOwner && isEditing ? (
                        <Button
                            onClick={handleSave}
                            disabled={submitting || !formData.title || !formData.description}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    ) : isOwner ? (
                        <Button
                            onClick={() => setIsEditing(true)}
                        >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmitFeedback}
                            disabled={submitting || !feedback.trim()}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    {existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
