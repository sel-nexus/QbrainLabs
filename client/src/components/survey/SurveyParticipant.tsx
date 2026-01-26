import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    ChevronLeft,
    ChevronRight,
    Check,
    Star,
    Circle,
    Square,
    Loader2
} from 'lucide-react';
import { Button } from '../ui/Button';

import { api } from '../../lib/api';

interface QuestionConfig {
    scale?: number;
    labels?: string[];
    max_length?: number;
    statements?: string[];
}

interface Question {
    id: string;
    order: number;
    text: string;
    type: string;
    required: boolean;
    options?: string[];
    config?: QuestionConfig;
}

interface SurveyData {
    id: string;
    title: string;
    description: string;
    questions: Question[];
    existing_response_id: string | null;
    existing_status: string | null;
}

interface SurveyParticipantProps {
    surveyId: string;
    participantId: string;
    onComplete?: () => void;
}

export function SurveyParticipant({ surveyId, participantId, onComplete }: SurveyParticipantProps) {
    const [survey, setSurvey] = useState<SurveyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        if (surveyId && participantId) {
            fetchSurvey();
        } else {
            setLoading(false);
            toast.error('Missing survey or participant information');
        }
    }, [surveyId, participantId]);

    const fetchSurvey = async () => {
        if (!surveyId || !participantId) {
            toast.error('Missing survey or participant information');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data } = await api.get(`/surveys/${surveyId}/participant`, {
                params: { participant_id: participantId }
            });

            setSurvey(data);

            if (data.existing_status === 'completed') {
                setCompleted(true);
            }
        } catch (error: any) {
            console.error('Failed to load survey:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Failed to load survey';

            if (errorMessage === 'You have already completed this survey') {
                setCompleted(true);
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const currentQuestion = survey?.questions[currentIndex];

    const setAnswer = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));

        // Auto-save progress
        saveProgress(questionId, value);
    };

    const saveProgress = async (questionId: string, value: any) => {
        try {
            await api.post(`/surveys/${surveyId}/save-progress`,
                { question_id: questionId, value },
                {
                    params: {
                        participant_id: participantId,
                        current_question: currentIndex
                    }
                }
            );
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    };

    const canProceed = () => {
        if (!currentQuestion) return false;
        if (!currentQuestion.required) return true;

        const answer = answers[currentQuestion.id];
        if (answer === undefined || answer === null || answer === '') return false;
        if (Array.isArray(answer) && answer.length === 0) return false;

        return true;
    };

    const goNext = () => {
        if (!canProceed()) {
            toast.error('Please answer this question');
            return;
        }

        if (currentIndex < (survey?.questions.length || 0) - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const goPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const submitSurvey = async () => {
        if (!canProceed()) {
            toast.error('Please answer this question');
            return;
        }

        // Validate all required questions
        const unanswered = survey?.questions.filter(q => {
            if (!q.required) return false;
            const answer = answers[q.id];
            return answer === undefined || answer === null || answer === '' ||
                (Array.isArray(answer) && answer.length === 0);
        });

        if (unanswered && unanswered.length > 0) {
            toast.error(`Please answer all required questions (${unanswered.length} remaining)`);
            return;
        }

        try {
            setSubmitting(true);

            await api.post(`/surveys/${surveyId}/submit`,
                {
                    answers: Object.entries(answers).map(([question_id, value]) => ({
                        question_id,
                        value
                    }))
                },
                {
                    params: { participant_id: participantId }
                }
            );

            setCompleted(true);
            toast.success('Survey submitted successfully!');

            if (onComplete) {
                onComplete();
            }
        } catch (error: any) {
            console.error('Failed to submit survey:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Failed to submit survey';
            toast.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (completed) {
        return (
            <div className="max-w-lg mx-auto text-center py-12">
                <div className="w-16 h-16 theme-success-bg rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 theme-success-text" />
                </div>
                <h2 className="text-2xl font-bold mb-2 theme-text-primary">Thank You!</h2>
                <p className="theme-text-secondary">Your responses have been recorded.</p>
            </div>
        );
    }

    if (!survey || !currentQuestion) {
        return (
            <div className="text-center py-12 theme-text-secondary">
                Survey not available
            </div>
        );
    }

    const progress = ((currentIndex + 1) / survey.questions.length) * 100;
    const isLastQuestion = currentIndex === survey.questions.length - 1;

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2 theme-text-primary">{survey.title}</h1>
                {survey.description && (
                    <p className="theme-text-secondary">{survey.description}</p>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
                <div className="flex items-center justify-between text-sm mb-2 theme-text-secondary">
                    <span>Question {currentIndex + 1} of {survey.questions.length}</span>
                    <span>{Math.round(progress)}% complete</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden theme-bg-tertiary">
                    <div
                        className="h-full bg-gradient-to-r from-brand-violet to-brand-magenta transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Question */}
            <div className="rounded-xl p-6 border mb-6 theme-card theme-border shadow-sm">
                <div className="flex items-start gap-3 mb-6">
                    <span className="text-sm font-mono text-brand-violet bg-brand-violet/10 px-2 py-1 rounded">
                        Q{currentIndex + 1}
                    </span>
                    <div>
                        <h2 className="text-lg theme-text-primary">
                            {currentQuestion.text}
                            {currentQuestion.required && <span className="theme-danger-text ml-1">*</span>}
                        </h2>
                    </div>
                </div>

                {/* Answer Input */}
                <div className="space-y-3">
                    {/* Multiple Choice */}
                    {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                        <div className="space-y-2">
                            {currentQuestion.options.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setAnswer(currentQuestion.id, option)}
                                    className={`w-full flex items-center gap-3 p-4 rounded-lg border transition text-left ${answers[currentQuestion.id] === option
                                        ? 'bg-brand-violet/20 border-brand-violet text-brand-violet'
                                        : 'theme-bg-tertiary theme-border theme-text-secondary hover:border-brand-violet/50'
                                        }`}
                                >
                                    <Circle className={`w-5 h-5 ${answers[currentQuestion.id] === option ? 'fill-brand-violet text-brand-violet' : ''
                                        }`} />
                                    {option}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Multiple Select */}
                    {currentQuestion.type === 'multiple_select' && currentQuestion.options && (
                        <div className="space-y-2">
                            {currentQuestion.options.map((option, idx) => {
                                const selected = (answers[currentQuestion.id] || []).includes(option);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            const current = answers[currentQuestion.id] || [];
                                            const newValue = selected
                                                ? current.filter((v: string) => v !== option)
                                                : [...current, option];
                                            setAnswer(currentQuestion.id, newValue);
                                        }}
                                        className={`w-full flex items-center gap-3 p-4 rounded-lg border transition text-left ${selected
                                            ? 'bg-brand-violet/20 border-brand-violet text-brand-violet'
                                            : 'theme-bg-tertiary theme-border theme-text-secondary hover:border-brand-violet/50'
                                            }`}
                                    >
                                        <Square className={`w-5 h-5 ${selected ? 'fill-brand-violet text-brand-violet' : ''}`} />
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Rating */}
                    {currentQuestion.type === 'rating' && (
                        <div className="flex items-center justify-center gap-2 py-4">
                            {Array.from({ length: currentQuestion.config?.scale || 5 }, (_, i) => i + 1).map((value) => (
                                <button
                                    key={value}
                                    onClick={() => setAnswer(currentQuestion.id, value)}
                                    className={`p-2 transition ${answers[currentQuestion.id] >= value
                                        ? 'theme-warning-text'
                                        : 'theme-text-secondary hover:theme-warning-text/50'
                                        }`}
                                >
                                    <Star className={`w-8 h-8 ${answers[currentQuestion.id] >= value ? 'fill-current' : ''}`} />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Text */}
                    {currentQuestion.type === 'text' && (
                        <input
                            type="text"
                            value={answers[currentQuestion.id] || ''}
                            onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                            placeholder="Type your answer..."
                            maxLength={currentQuestion.config?.max_length || 200}
                            className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-brand-violet theme-input"
                        />
                    )}

                    {/* Textarea */}
                    {currentQuestion.type === 'textarea' && (
                        <textarea
                            value={answers[currentQuestion.id] || ''}
                            onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                            placeholder="Type your answer..."
                            maxLength={currentQuestion.config?.max_length || 1000}
                            rows={4}
                            className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-brand-violet resize-none theme-input"
                        />
                    )}

                    {/* Likert */}
                    {currentQuestion.type === 'likert' && currentQuestion.config?.statements && (
                        <div className="space-y-4">
                            {currentQuestion.config.statements.map((statement, stmtIdx) => (
                                <div key={stmtIdx} className="rounded-lg p-4 theme-bg-tertiary">
                                    <p className="mb-3 theme-text-primary">{statement}</p>
                                    <div className="flex items-center justify-between gap-2">
                                        {Array.from({ length: currentQuestion.config?.scale || 5 }, (_, i) => i + 1).map((value) => {
                                            const currentAnswers = answers[currentQuestion.id] || {};
                                            const selected = currentAnswers[statement] === value;
                                            return (
                                                <button
                                                    key={value}
                                                    onClick={() => {
                                                        const newAnswers = { ...currentAnswers, [statement]: value };
                                                        setAnswer(currentQuestion.id, newAnswers);
                                                    }}
                                                    className={`flex-1 py-2 rounded-lg border transition ${selected
                                                        ? 'bg-brand-violet border-brand-violet text-white'
                                                        : 'theme-bg-secondary theme-border theme-text-secondary hover:border-brand-violet/50'
                                                        }`}
                                                >
                                                    {value}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {currentQuestion.config?.labels && (
                                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                                            <span>{currentQuestion.config.labels[0]}</span>
                                            <span>{currentQuestion.config.labels[currentQuestion.config.labels.length - 1]}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Previous
                </Button>

                {isLastQuestion ? (
                    <Button onClick={submitSurvey} disabled={submitting}>
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                Submit Survey
                                <Check className="w-5 h-5 ml-1" />
                            </>
                        )}
                    </Button>
                ) : (
                    <Button onClick={goNext}>
                        Next
                        <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                )}
            </div>
        </div>
    );
}
