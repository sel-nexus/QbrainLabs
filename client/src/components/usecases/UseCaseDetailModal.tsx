import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { Loader2, Save, X, MessageSquare, Edit2, Eye, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '../ConfirmationModal';
import { FIELDS, validateUseCase, type FieldKey } from '../../lib/useCaseFields';
import { errorMessage as apiErrorMessage } from '../../lib/apiErrors';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    const [formData, setFormData] = useState<UseCase | null>(null);
    const [feedback, setFeedback] = useState('');
    const [existingFeedback, setExistingFeedback] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [loadingFeedback, setLoadingFeedback] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
    const [confirmWithdraw, setConfirmWithdraw] = useState(false);

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

        // Same rules as when the use case was created.
        const found = validateUseCase({
            title: formData.title || '',
            description: formData.description || '',
            proposed_solution: formData.proposed_solution || '',
            kpi: formData.kpi || '',
            target_user: formData.target_user || '',
        });
        setFieldErrors(found);
        if (Object.values(found).some(Boolean)) {
            toast.error(t('useCaseForm.fixHighlighted'));
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
                category: formData.category || ''
            });

            toast.success(t('useCaseDetail.updated'));
            setIsEditing(false);
            if (onUpdate) {
                onUpdate();
            }
        } catch (error: any) {
            console.error('Failed to update use case:', error);
            toast.error(apiErrorMessage(error, t('useCaseDetail.updateFailed')));
        } finally {
            setSubmitting(false);
        }
    };

    const handleWithdraw = async () => {
        if (!useCase) return;
        try {
            setSubmitting(true);
            await api.delete(`/usecases/${useCase.id}`, { params: { participant_id: participantId } });
            toast.success(t('useCaseDetail.withdrawn'));
            onUpdate?.();
            onClose();
        } catch (error) {
            toast.error(apiErrorMessage(error, t('useCaseDetail.withdrawFailed')));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitFeedback = async () => {
        if (!useCase || !feedback.trim()) {
            toast.error(t('useCaseDetail.enterFeedback'));
            return;
        }

        if (feedback.length > 500) {
            toast.error(t('useCaseDetail.feedbackTooLong'));
            return;
        }

        try {
            setSubmitting(true);
            await api.post(`/usecases/${useCase.id}/feedback`, {
                feedback_text: feedback.trim()
            }, {
                params: { participant_id: participantId }
            });

            toast.success(t('useCaseDetail.feedbackSubmitted'));
            setExistingFeedback(feedback);
            if (onUpdate) {
                onUpdate();
            }
        } catch (error: any) {
            console.error('Failed to submit feedback:', error);
            toast.error(apiErrorMessage(error, t('useCaseDetail.feedbackFailed')));
        } finally {
            setSubmitting(false);
        }
    };

    if (!useCase || !formData) {
        return null;
    }

    return (
        <Modal isOpen={true} onClose={onClose} title={t('useCaseDetail.title')} size="large">
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
                            {t('useCaseDetail.yours')}
                        </>
                    ) : (
                        <>
                            <Eye className="w-4 h-4" />
                            {t('useCaseDetail.viewOnly')}
                        </>
                    )}
                </div>

                {/* Title */}
                <div>
                    <label className="text-sm font-medium theme-text-secondary mb-1.5 block">
                        {FIELDS.title.label}{FIELDS.title.required && isEditing ? ' *' : ''}
                    </label>
                    {isEditing ? (
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder={FIELDS.title.placeholder}
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
                        {FIELDS.description.label}{FIELDS.description.required && isEditing ? ' *' : ''}
                    </label>
                    {isEditing ? (
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder={FIELDS.description.placeholder}
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
                        {FIELDS.proposed_solution.label}{FIELDS.proposed_solution.required && isEditing ? ' *' : ''}
                    </label>
                    {isEditing ? (
                        <textarea
                            value={formData.proposed_solution || ''}
                            onChange={(e) => setFormData({ ...formData, proposed_solution: e.target.value })}
                            placeholder={FIELDS.proposed_solution.placeholder}
                            rows={4}
                            className="w-full px-4 py-3 rounded-lg theme-input-bg theme-border border theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-violet resize-none"
                        />
                    ) : (
                        <div className="px-4 py-3 rounded-lg theme-bg-tertiary theme-text-primary whitespace-pre-wrap">
                            {formData.proposed_solution || t('useCaseDetail.notSpecified')}
                        </div>
                    )}
                </div>

                {/* Grid for KPI, Target User, Category */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm font-medium theme-text-secondary mb-1.5 block">
                            {FIELDS.kpi.label}{FIELDS.kpi.required && isEditing ? ' *' : ''}
                        </label>
                        {isEditing ? (
                            <Input
                                value={formData.kpi || ''}
                                onChange={(e) => setFormData({ ...formData, kpi: e.target.value })}
                                placeholder="e.g. Reduce handle time by 20%"
                            />
                        ) : (
                            <div className="px-4 py-3 rounded-lg theme-bg-tertiary theme-text-primary">
                                {formData.kpi || t('useCaseDetail.notSpecified')}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium theme-text-secondary mb-1.5 block">
                            {FIELDS.target_user.label}{FIELDS.target_user.required && isEditing ? ' *' : ''}
                        </label>
                        {isEditing ? (
                            <Input
                                value={formData.target_user || ''}
                                onChange={(e) => setFormData({ ...formData, target_user: e.target.value })}
                                placeholder="e.g. Support Agents"
                            />
                        ) : (
                            <div className="px-4 py-3 rounded-lg theme-bg-tertiary theme-text-primary">
                                {formData.target_user || t('useCaseDetail.notSpecified')}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium theme-text-secondary mb-1.5 block">
                            {t('useCaseForm.aiType')}
                        </label>
                        {isEditing ? (
                            <select
                                value={formData.category || 'Generative AI'}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg theme-input-bg theme-border border theme-text-primary focus:outline-none focus:ring-2 focus:ring-brand-violet"
                            >
                                <option value="Generative AI">{t('useCaseForm.aiTypes.generative')}</option>
                                <option value="Predictive ML">{t('useCaseForm.aiTypes.predictive')}</option>
                                <option value="Computer Vision">{t('useCaseForm.aiTypes.vision')}</option>
                                <option value="Robotics">{t('useCaseForm.aiTypes.robotics')}</option>
                                <option value="Other">{t('useCaseForm.aiTypes.other')}</option>
                            </select>
                        ) : (
                            <div className="px-4 py-3 rounded-lg theme-bg-tertiary theme-text-primary">
                                {formData.category || t('useCaseDetail.notSpecified')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Feedback Section (for non-owners) */}
                {!isOwner && (
                    <div>
                        <label className="text-sm font-medium theme-text-secondary mb-1.5 block flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            {t('useCaseDetail.yourFeedback')}
                        </label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder={t('useCaseDetail.feedbackPlaceholder')}
                            rows={4}
                            maxLength={500}
                            className="w-full px-4 py-3 rounded-lg theme-input-bg theme-border border theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-violet resize-none"
                        />
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-xs theme-text-secondary">
                                {t('useCaseDetail.characters', { count: feedback.length, max: 500 })}
                            </span>
                            {existingFeedback && (
                                <span className="text-xs theme-text-secondary">
                                    {t('useCaseDetail.feedbackWillUpdate')}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {isEditing && Object.values(fieldErrors).some(Boolean) && (
                    <ul role="alert" className="text-sm text-semantic-danger list-disc pl-5">
                        {(Object.keys(fieldErrors) as FieldKey[]).filter((k) => fieldErrors[k]).map((k) => (
                            <li key={k}>{FIELDS[k].label}: {fieldErrors[k]}</li>
                        ))}
                    </ul>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t theme-border">
                    {isOwner && (
                        <Button
                            variant="ghost"
                            className="mr-auto text-semantic-danger"
                            onClick={() => setConfirmWithdraw(true)}
                            disabled={submitting}
                        >
                            <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" /> {t('useCaseDetail.withdraw')}
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        {isOwner && isEditing ? t('useCaseDetail.cancel') : t('useCaseDetail.close')}
                    </Button>
                    {isOwner && isEditing ? (
                        <Button
                            onClick={handleSave}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t('useCaseDetail.saving')}
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    {t('useCaseDetail.save')}
                                </>
                            )}
                        </Button>
                    ) : isOwner ? (
                        <Button
                            onClick={() => setIsEditing(true)}
                        >
                            <Edit2 className="w-4 h-4 mr-2" />
                            {t('useCaseDetail.edit')}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmitFeedback}
                            disabled={submitting || !feedback.trim()}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t('useCaseDetail.submitting')}
                                </>
                            ) : (
                                <>
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    {existingFeedback ? t('useCaseDetail.updateFeedback') : t('useCaseDetail.submitFeedback')}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
            <ConfirmationModal
                isOpen={confirmWithdraw}
                onClose={() => setConfirmWithdraw(false)}
                onConfirm={handleWithdraw}
                title={t('useCaseDetail.withdrawTitle')}
                message={t('useCaseDetail.withdrawMessage')}
                confirmText={t('useCaseDetail.withdraw')}
                cancelText={t('useCaseDetail.keep')}
                variant="danger"
            />
        </Modal>
    );
}
